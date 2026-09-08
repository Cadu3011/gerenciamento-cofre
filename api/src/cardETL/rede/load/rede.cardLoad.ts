import { Inject } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { RedeLoadStrategy } from '../contracts/rede.load.strategy';
import { RedeCardTransformedMovement } from '../contracts/rede.transform.strategy';

export class RedeCardLoad implements RedeLoadStrategy {
  key: string;

  @Inject()
  private readonly prisma: PrismaService;

  async execute(ctx: RedeCardTransformedMovement[]) {
    let inserted = 0;
    const BATCH_SIZE = 1000;

    for (let i = 0; i < ctx.length; i += BATCH_SIZE) {
      const chunk = ctx.slice(i, i + BATCH_SIZE);

      try {
        const createds = await this.prisma.redeVenda.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        inserted += createds.count;
      } catch (batchError) {
        console.error(
          `❌ Erro no batch ${i}-${i + BATCH_SIZE}, tentando individual...`,
        );

        // 🔥 fallback item por item
        let insertedIndividualError = 0;

        for (const item of chunk) {
          try {
            await this.prisma.redeVenda.create({
              data: item,
            });
            inserted++;
          } catch (itemError: any) {
            insertedIndividualError++;
          }
        }
        console.error(`❌ Erro ao inserir itens:`, {
          quantidade: insertedIndividualError,
          amostra: chunk.slice(0, 5).map((item) => ({
            idempotencyKey: item.idempotencyKey,
            erro: 'Erro ao inserir item',
          })),
        });
      }
    }
    return inserted;
  }
}
