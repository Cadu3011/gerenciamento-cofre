import { Inject } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { RedeLoadStrategy } from '../contracts/rede.load.strategy';
import { RedeParcTransformedMovement } from '../contracts/rede.transform.strategy';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

export class RedeParcLoad implements RedeLoadStrategy {
  key: string;

  @Inject()
  private readonly prisma: PrismaService;

  async execute(
    ctx: RedeParcTransformedMovement[],
    context: JobExecutionContext,
  ) {
    if (ctx.length == 0) return;
    try {
      const BATCH_SIZE = 1000;

      for (let i = 0; i < ctx.length; i += BATCH_SIZE) {
        const chunk = ctx.slice(i, i + BATCH_SIZE);

        try {
          const result = await this.prisma.redeParcela.createMany({
            data: chunk,
            skipDuplicates: true,
          });
          context.incrementInserted(result.count);
          context.info('LOAD', `${result.count} linhas registradas`);
        } catch (batchError) {
          console.error(
            `❌ Erro no batch ${i}-${i + BATCH_SIZE}, tentando individual...`,
          );
          context.warn(
            'LOAD',
            `❌ Erro no batch ${i}-${i + BATCH_SIZE}, tentando individual...`,
          );

          // 🔥 fallback item por item
          for (const item of chunk) {
            try {
              await this.prisma.redeParcela.create({
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
      context.error('LOAD', error.message);
      throw error;
    }
  }
}
