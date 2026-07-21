import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { FilialService } from 'src/filial/filial.service';
import { ConciliacaoParcPipeline } from './conciliacao-parc.pipeline';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

@Injectable()
export class ConciParcCron {
  @Inject()
  private readonly filialService: FilialService;

  @Inject()
  private readonly prisma: PrismaService;

  @Inject()
  private readonly pipeline: ConciliacaoParcPipeline;

  private readonly logger = new Logger(ConciParcCron.name);

  private toISODate(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  private addDays(dateStr: string, days: number) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return this.toISODate(d);
  }

  private diffDays(from: string, to: string) {
    const a = new Date(from + 'T00:00:00').getTime();
    const b = new Date(to + 'T00:00:00').getTime();
    return Math.floor((b - a) / (1000 * 60 * 60 * 24));
  }

  async execute(context: JobExecutionContext) {
    const filiais = await this.filialService.findAll();
    const today = this.toISODate(new Date());
    const dMinus1 = this.addDays(today, -1);
    const start = this.addDays(today, -6);
    const errors: string[] = [];

    for (const f of filiais) {
      let current = start;
      while (this.diffDays(current, dMinus1) >= 0) {
        context.info(
          'PIPELINE_PARC',
          `Pipeline parcelas Filial ${f.id} Data ${current}`,
        );
        try {
          const result = await this.pipeline.execute(current, f.id);
          this.logger.debug(
            `Filial ${f.id} Data ${current} - ${result.total} parcelas (${result.conciliados} conciliadas, ${result.divergentes} divergentes)`,
          );
          await context.incrementExtracted(result.total);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          const log = `Filial ${f.id} - Data ${current} - ${message}`;
          errors.push(log);
          await context.error('PIPELINE_PARC', log);
        }

        current = this.addDays(current, 1);
      }
    }

    this.logger.log(
      `Conciliação parcelas finalizada. Total de erros: ${errors.length}`,
    );

    if (errors.length > 0) {
      this.logger.error(errors.join('\n'));
      throw new Error(`${errors.length} conciliações de parcelas falharam`);
    }

    return { ok: true };
  }
}
