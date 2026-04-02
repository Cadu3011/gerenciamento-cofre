import { Inject } from '@nestjs/common';
import { RedeLoadStrategy } from '../contracts/rede.load.strategy';
import { RedeCardTransformedMovement } from '../contracts/rede.transform.strategy';
import { PrismaService } from 'src/database/prisma.service';

export class RedeCardLoad implements RedeLoadStrategy {
  key: string;

  @Inject()
  private readonly prisma: PrismaService;

  async execute(ctx: RedeCardTransformedMovement[]) {
    try {
      const BATCH_SIZE = 1000;

      for (let i = 0; i < ctx.length; i += BATCH_SIZE) {
        const chunk = ctx.slice(i, i + BATCH_SIZE);

        try {
          await this.prisma.redeVenda.createMany({
            data: chunk,
            skipDuplicates: true,
          });
        } catch (batchError) {
          console.error(
            `❌ Erro no batch ${i}-${i + BATCH_SIZE}, tentando individual...`,
          );

          // 🔥 fallback item por item
          for (const item of chunk) {
            try {
              await this.prisma.redeVenda.create({
                data: item,
              });
            } catch (itemError: any) {
              console.error(`❌ Erro ao inserir item:`, {
                idempotencyKey: item.idempotencyKey,
                erro: itemError.message,
              });
            }
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }
}
