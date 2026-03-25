import { Inject, Injectable } from '@nestjs/common';
import { TrierLoadStrategy } from '../contracts/trier.load.strategy';
import { TrierCardTransformedMovement } from '../contracts/trier.transform.strategyc';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class TrierCardLoad implements TrierLoadStrategy {
  key: string;
  @Inject()
  private readonly prisma: PrismaService;

  async execute(ctx: TrierCardTransformedMovement[]): Promise<string> {
    let inserted = 0;
    let duplicates = 0;
    const sampleKeys: string[] = [];
    const SAMPLE_LIMIT = 5;

    for (const item of ctx) {
      const {
        hora,
        dataEmissao,
        dataVencimento,
        dataPagamento,
        filialId,
        ...itemData
      } = item;
      try {
        await this.prisma.trierCartaoVendas.create({
          data: {
            ...itemData,
            hora: hora ? new Date(`1970-01-01T${hora}`) : null,
            dataEmissao: new Date(`${dataEmissao}T00:00:00`),
            dataPagamento: dataPagamento
              ? new Date(`${dataPagamento}T00:00:00`)
              : null,
            dataVencimento: dataVencimento
              ? new Date(`${dataVencimento}T00:00:00`)
              : null,
            filial: { connect: { id: filialId } },
          },
        });
        inserted++;
      } catch (e: any) {
        if (e?.code === 'P2002') {
          duplicates++;
          if (sampleKeys.length < SAMPLE_LIMIT)
            sampleKeys.push(itemData.idempotencyKey);
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

    return 'success';
  }
}
