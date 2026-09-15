import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedeCardETLPipeline } from '../pipeline/rede.card-etl.pipeline';
import { FilialService } from 'src/filial/filial.service';
import { PrismaService } from 'src/database/prisma.service';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';
import { JobPeriodType, RunJobQueryDto } from 'src/jobs/dto/runCronJob.dto';

@Injectable()
export class RedeCardCron {
  @Inject()
  private readonly pipeline: RedeCardETLPipeline;

  @Inject()
  private readonly filialService: FilialService;

  @Inject()
  private readonly prisma: PrismaService;

  private toISODate(d: Date) {
    return d.toISOString().slice(0, 10);
  }
  private readonly logger = new Logger(RedeCardCron.name);

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

  private async resolvePeriod(
    filialId: number,
    options: RunJobQueryDto,
  ): Promise<{ start: string; end: string } | null> {
    if (options.period === JobPeriodType.DATE) {
      return { start: options.date, end: options.date };
    }

    if (options.period === JobPeriodType.RANGE) {
      return { start: options.startDate, end: options.endDate };
    }

    const today = this.toISODate(new Date());
    const dMinus1 = this.addDays(today, -1);

    const last = await this.prisma.redeVenda.aggregate({
      where: { filialId },
      _max: { dataVenda: true },
    });

    const startBase = last._max.dataVenda
      ? this.toISODate(new Date(last._max.dataVenda))
      : '2026-01-01';

    const start = this.addDays(startBase, -2);

    if (this.diffDays(start, dMinus1) < 0) {
      return null;
    }

    return { start, end: dMinus1 };
  }

  async execute(
    context: JobExecutionContext,
    options: RunJobQueryDto,
    filialId?: number,
  ) {
    const filiais = filialId
      ? await this.prisma.filial.findMany({ where: { id: filialId } })
      : await this.prisma.filial.findMany({ where: { NOT: { id: 1 } } });

    const processFilial = async (f: {
      id: number;
      name: string;
    }): Promise<{ filial: number; lastUpdatedDate: string | null }> => {
      const executionContext = options.bigCharge
        ? context.createChild({
            logLevel: 'WARN_ERROR',
            maxLogs: 1000,
          })
        : context;

      try {
        const period = await this.resolvePeriod(f.id, options);

        if (!period) {
          return {
            filial: f.id,
            lastUpdatedDate: null,
          };
        }

        const { start, end } = period;

        if (this.diffDays(start, end) > 10 && !options.bigCharge) {
          const error = new Error(
            'Periodo muito grande. Reinicie o CronJob no modo BigCharge',
          ) as Error & {
            obj?: { code: string };
          };

          error.obj = {
            code: '02',
          };

          throw error;
        }

        if (this.diffDays(start, end) < 0) {
          return {
            filial: f.id,
            lastUpdatedDate: end,
          };
        }

        const progressKey = `RedeCard-${f.id}`;

        await executionContext.startDateProgress(progressKey, start, end);

        let current = start;

        while (this.diffDays(current, end) >= 0) {
          this.logger.log(`ETL Rede filial ${f.name} - dia ${current}`);

          await executionContext.info(
            'PIPELINE',
            `Pipeline Iniciada filial ${f.name} - dia ${current}`,
          );

          await this.pipeline.execute(
            { date: current, idRede: f.id },
            executionContext,
          );

          await executionContext.updateDateProgress(progressKey, current);
          current = this.addDays(current, 1);
        }

        return {
          filial: f.id,
          lastUpdatedDate: end,
        };
      } finally {
        if (options.bigCharge) {
          await context.merge(executionContext);
          executionContext.logs.length = 0;
        }
      }
    };

    let resultsLastDates: Array<{
      filial: number;
      lastUpdatedDate: string | null;
    }>;

    if (options.bigCharge) {
      resultsLastDates = await Promise.all(
        filiais.map((f) => processFilial(f)),
      );
    } else {
      resultsLastDates = [];

      for (const f of filiais) {
        resultsLastDates.push(await processFilial(f));
      }
    }

    return { lastUpdatedByFilial: resultsLastDates };
  }
}
