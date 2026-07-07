import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';
import { TrierLoadStrategy } from '../contracts/trier.load.strategy';
import { TrierParcTransformedMovement } from '../contracts/trier.transform.strategyc';

@Injectable()
export class TrierParcLoad implements TrierLoadStrategy {
  key: string;
  @Inject()
  private readonly prisma: PrismaService;

  async execute(ctx: TrierParcTransformedMovement[]): Promise<number> {
    let inserted = 0;
    let duplicates = 0;
    const sampleKeys: string[] = [];
    const SAMPLE_LIMIT = 5;

    for (const item of ctx) {
      try {
        await this.prisma.trierParcela.create({
          data: {
            idempotencyKey: item.idempotencyKey,
            filialId: item.filialId,

            tipo: 'PARCELA',
            vendaId: item.vendaId,
            documentoFiscal: item.documentoFiscal,
            nsuAdministradora: item.nsuAdministradora,

            modalidadeVenda: item.modalidadeVenda,

            parcela: item.parcela,
            totalParcelas: item.totalParcelas,

            dataEmissao: item.dataEmissao,
            dataVencimento: item.dataVencimento,
            dataPagamento: item.dataPagamento,

            valor: item.valor,
            valorLiquido: item.valorLiquido,
            valorTaxas: item.valorTaxas,

            bandeira: item.bandeira,
            administradoraCartao: item.administradoraCartao,

            prazoVenda: item.prazoVenda,
          },
        });
        inserted++;
      } catch (e: any) {
        if (e?.code === 'P2002') {
          duplicates++;
          if (sampleKeys.length < SAMPLE_LIMIT)
            sampleKeys.push(item.idempotencyKey);
          continue;
        }
        throw e;
      }
    }

    if (duplicates > 0) {
      console.warn(
        `Idempotência: ${duplicates} duplicados ignorados. Inseridos: ${inserted}. Amostra: ${sampleKeys.join(', ')}`,
      );
    }
    return inserted;
  }
}
