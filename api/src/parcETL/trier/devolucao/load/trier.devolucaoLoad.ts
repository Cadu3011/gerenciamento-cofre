import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';
import { DevolucaoTransformada } from '../contracts/trier.devolucao.types';

export type DevolucaoLoadResult = {
  inseridas: number;
  atualizadas: number;
};

/**
 * Grava as devoluções localizando o registro por (filialId, documentoFiscal).
 *
 * Não dá para usar `upsert` com esse par: numa venda parcelada várias linhas
 * compartilham o mesmo `documentoFiscal`, differedindo em `numeroParcela`, e
 * a chave precisa ser `@@unique` para o Prisma aceitar. O que separa uma
 * devolução de uma parcela de venda é o valor negativo — nenhuma venda gera
 * parcela negativa. Por isso a busca carrega `valor: { lt: 0 }`, o que
 * também casa com as linhas que o ETL antigo gravou (com `tipo` = 'PARCELA'),
 * sem depender da coluna nova.
 *
 * A chave de idempotência de uma devolução carrega a bandeira na composição,
 * e a bandeira do estorno era `null`. Se fosse reconstruída aqui, a devolução
 * que já existe no banco deixaria de casar e viraria uma linha duplicada em
 * vez de ser atualizada. Por isso o `idempotencyKey` só é definido na
 * inserção, e nunca muda numa atualização.
 */
@Injectable()
export class TrierDevolucaoLoad {
  @Inject()
  private readonly prisma: PrismaService;

  async execute(linhas: DevolucaoTransformada[]): Promise<DevolucaoLoadResult> {
    let inseridas = 0;
    let atualizadas = 0;

    for (const linha of linhas) {
      const { filialId, documentoFiscal } = linha;

      const existente = await this.prisma.trierParcela.findFirst({
        where: {
          filialId,
          documentoFiscal,
          valor: { lt: 0 },
        },
        select: { id: true },
      });

      if (existente) {
        await this.prisma.trierParcela.update({
          where: { id: existente.id },
          data: {
            tipo: 'DEVOLUCAO',
            documentoFiscalEstorno: linha.documentoFiscalEstorno,
            bandeira: linha.bandeira,
            dataEmissao: new Date(`${linha.dataEmissao}T00:00:00`),
            dataVencimento: new Date(`${linha.dataVencimento}T00:00:00`),
            valor: linha.valor,
            valorLiquido: linha.valorLiquido,
            valorTaxas: linha.valorTaxas,
            nsuAdministradora: linha.nsuAdministradora,
            parcela: linha.parcela,
            totalParcelas: linha.totalParcelas,
          },
        });
        atualizadas++;
        continue;
      }

      await this.prisma.trierParcela.create({
        data: {
          idempotencyKey: `TRIER|${filialId}|${linha.dataEmissao}|DEV:${documentoFiscal}|${linha.valor}`,
          filialId,

          tipo: 'DEVOLUCAO',
          documentoFiscal: documentoFiscal,
          documentoFiscalEstorno: linha.documentoFiscalEstorno,
          nsuAdministradora: linha.nsuAdministradora,

          modalidadeVenda: linha.modalidadeVenda,

          parcela: linha.parcela,
          totalParcelas: linha.totalParcelas,

          dataEmissao: new Date(`${linha.dataEmissao}T00:00:00`),
          dataVencimento: new Date(`${linha.dataVencimento}T00:00:00`),
          dataPagamento: null,

          valor: linha.valor,
          valorLiquido: linha.valorLiquido,
          valorTaxas: linha.valorTaxas,

          bandeira: linha.bandeira,
          administradoraCartao: linha.administradoraCartao,

          prazoVenda: linha.prazoVenda,
        },
      });
      inseridas++;
    }

    return { inseridas, atualizadas };
  }
}
