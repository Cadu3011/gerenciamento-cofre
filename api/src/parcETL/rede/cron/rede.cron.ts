import { Inject, Logger } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';
import { RedeParcETLPipeline } from '../pipeline/rede.card-etl.pipeline';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';
import { RunJobQueryDto } from 'src/jobs/dto/runCronJob.dto';

export class RedeParcCron {
  @Inject()
  private readonly pipeline: RedeParcETLPipeline;

  @Inject()
  private readonly prisma: PrismaService;

  private toISODate(d: Date) {
    return d.toISOString().slice(0, 10);
  }
  private readonly logger = new Logger(RedeParcCron.name);

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
    // =========================================================
    // DATE
    // =========================================================

    if (options.period === 'DATE') {
      return {
        start: options.date,
        end: options.date,
      };
    }

    // =========================================================
    // RANGE
    // =========================================================

    if (options.period === 'RANGE') {
      return {
        start: options.startDate,
        end: options.endDate,
      };
    }

    // =========================================================
    // AUTO
    // =========================================================

    const today = this.toISODate(new Date());
    const dMinus1 = this.addDays(today, -1);

    const last = await this.prisma.redeParcela.aggregate({
      where: {
        filialId,
      },
      _max: {
        dataVenda: true,
      },
    });

    const startBase = last._max.dataVenda
      ? this.toISODate(new Date(last._max.dataVenda))
      : '2026-01-01';

    const start = this.addDays(startBase, 1);

    if (this.diffDays(start, dMinus1) < 0) {
      return null;
    }

    return {
      start,
      end: dMinus1,
    };
  }

  async execute(context: JobExecutionContext, options: RunJobQueryDto) {
    const filiais = await this.prisma.filial.findMany({
      where: { NOT: { id: 1 } },
    });

    let abort = false;
    let abortReason: any = null;

    const processFilial = async (f) => {
      if (abort) {
        throw abortReason;
      }
      const progressKey = `RedeParc-${f.id}`;
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

        await executionContext.startDateProgress(progressKey, start, end);
        let current = start;

        while (this.diffDays(current, end) >= 0) {
          if (abort) {
            throw abortReason;
          }

          await executionContext.info(
            'PIPELINE',
            `Pipeline iniciada filial ${f.name} - dia ${current}`,
          );

          await this.pipeline.execute(
            {
              date: current,
              idRede: f.id,
            },
            executionContext,
          );
          await executionContext.updateDateProgress(progressKey, current);
          current = this.addDays(current, 1);
        }

        return {
          filial: f.id,
          lastUpdatedDate: end,
        };
      } catch (error) {
        /**
         * Apenas BigCharge cancela tudo
         */
        if (options.bigCharge) {
          abort = true;
          abortReason = error;
        }

        throw error;
      } finally {
        if (options.bigCharge) {
          await context.merge(executionContext);
          executionContext.logs.length = 0;
        }
      }
    };

    let resultsLastDates;

    if (options.bigCharge) {
      const results = await Promise.allSettled(
        filiais.map((f) => processFilial(f)),
      );

      const failed = results.find((r) => r.status === 'rejected');

      if (failed?.status === 'rejected') {
        throw failed.reason;
      }

      resultsLastDates = results
        .filter(
          (r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled',
        )
        .map((r) => r.value);
    } else {
      resultsLastDates = [];

      for (const f of filiais) {
        resultsLastDates.push(await processFilial(f));
      }
    }

    return {
      lastUpdatedByFilial: resultsLastDates,
    };
  }
}
