import { Inject, Injectable } from '@nestjs/common';

import { Decimal } from '@prisma/client/runtime/library';
import {
  TrierParcTransformedMovement,
  TrierTransformStrategy,
} from '../contracts/trier.transform.strategyc';
import { MoveParcExtracted } from '../infra/http/trier-api.types';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class TrierParcTransform implements TrierTransformStrategy {
  key: string;
  @Inject()
  private readonly prisma: PrismaService;
  async execute(
    ctx: MoveParcExtracted[],
  ): Promise<TrierParcTransformedMovement[]> {
    if (!ctx.length) return [];

    const docs = [
      ...new Set(
        ctx.map((x) =>
          Number(
            x.documentoFiscal
              ? x.documentoFiscal
              : String(x.idTransacao.replace('RC:', '9000')),
          ),
        ),
      ),
    ];

    const vendas = await this.prisma.trierCartaoVendas.findMany({
      where: {
        documentoFiscal: {
          in: [...docs],
        },
        filialId: ctx[0].filialId,
      },
    });
    const vendasMap = new Map(vendas.map((v) => [v.documentoFiscal, v]));
    const parcTrasform: TrierParcTransformedMovement[] = ctx
      .filter((vendaParc) => vendaParc.codigoCartao !== 34)
      .map((vendaParc) => {
        const documento = Number(
          vendaParc.documentoFiscal
            ? vendaParc.documentoFiscal
            : String(vendaParc.idTransacao.replace('RC:', '9000')),
        );
        const venda = vendasMap.get(documento);
        if (!venda) {
          throw new Error(
            `Venda não encontrada. Documento=${documento} Filial=${vendaParc.filialId}`,
          );
        }

        const tipo = vendaParc.idTransacao.startsWith('RC:')
          ? 'RECEBIMENTO_CREDIARIO'
          : 'VENDA';
        const valor = Decimal(vendaParc.valorParcela).plus(
          Decimal(vendaParc.valorTaxas),
        );
        return {
          idempotencyKey: `TRIER|${vendaParc.filialId}|${vendaParc.dataEmissao ?? 'SEM_DATA'}|${documento}|${vendaParc.nomeCartao}|${vendaParc.nsuAdministradora}|${vendaParc.valorParcela}|${vendaParc.numeroParcela}`,
          documentoFiscal: Number(documento),
          valor: valor,
          valorLiquido: new Decimal(vendaParc.valorParcela),
          modalidadeVenda: vendaParc.modalidadeVenda,
          bandeira: vendaParc.nomeCartao ?? '',
          tipo,
          vendaId: venda.id,
          filialId: vendaParc.filialId,
          dataEmissao: new Date(`${vendaParc.dataEmissao}T00:00:00`),
          dataPagamento: vendaParc.dataPagamento
            ? new Date(`${vendaParc.dataPagamento}T00:00:00`)
            : null,
          dataVencimento: vendaParc.dataVencimento
            ? new Date(`${vendaParc.dataVencimento}T00:00:00`)
            : null,
          nsuAdministradora: vendaParc.nsuAdministradora,
          administradoraCartao: vendaParc.administradoraCartao,
          totalParcelas: vendaParc.totalParcelas,
          parcela: vendaParc.numeroParcela,
          valorTaxas: new Decimal(vendaParc.valorTaxas),
          prazoVenda: vendaParc.prazoVenda,
        };
      });
    return parcTrasform;
  }
}
