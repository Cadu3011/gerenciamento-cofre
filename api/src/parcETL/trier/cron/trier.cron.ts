import { Inject, Injectable, Logger } from '@nestjs/common';
import { TrierParcETLPipeline } from '../pipeline/trier.card-etl.pipeline.js';
import { authTrier } from 'src/auth/authTrier/loginTrier';
import { FilialService } from 'src/filial/filial.service';
import { PrismaService } from 'src/database/prisma.service';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service.js';

type AuthOk = { filial: number; url: string; token: string };
type AuthFail = { filial: number; url: string; error: unknown };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

@Injectable()
export class TrierParcCron {
  @Inject()
  private readonly pipeline: TrierParcETLPipeline;

  @Inject()
  private readonly filialService: FilialService;

  @Inject()
  private readonly prisma: PrismaService;

  private readonly logger = new Logger(TrierParcCron.name);

  private async authOnce(filial: {
    id: number;
    urlLocalTrier: string;
  }): Promise<AuthOk> {
    const token = (
      await authTrier(
        { login: '95', password: 'cadu3011' },
        filial.urlLocalTrier,
        filial.id,
      )
    ).token;

    return { filial: filial.id, url: filial.urlLocalTrier, token };
  }

  private async authWithRetry(
    filial: { id: number; urlLocalTrier: string },
    opts?: { maxAttempts?: number; delayMs?: number },
  ): Promise<AuthOk> {
    const maxAttempts = opts?.maxAttempts ?? 4;
    const delayMs = opts?.delayMs ?? 800;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.authOnce(filial);
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts) {
          await sleep(delayMs);
        }
      }
    }

    throw lastError;
  }

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

  async execute(context, bigCharge?: boolean) {
    const filiais = await this.filialService.findAll();

    const authResults = await Promise.allSettled(
      filiais.map((filial) =>
        this.authWithRetry(filial, {
          maxAttempts: 4,
          delayMs: 800,
        }),
      ),
    );

    const tokensFinal: AuthOk[] = [];

    authResults.forEach((result, index) => {
      const filial = filiais[index];

      if (result.status === 'fulfilled') {
        tokensFinal.push(result.value);
        return;
      }

      const reason = result.reason;

      if (reason?.code === 'ETIMEDOUT') {
        this.logger.error(`[IP NÃO ACESSÍVEL] ${filial.urlLocalTrier}`);
        context.error(
          'CRON',
          `[IP NÃO ACESSÍVEL] ${filial.urlLocalTrier} Filial: ${filial.name}`,
        );
        return;
      }

      this.logger.error(
        `[AUTH FAIL] filial=${filial.id} url=${filial.urlLocalTrier}`,
        reason,
      );

      context.error(
        'CRON',
        `[AUTH FAIL] filial=${filial.id} url=${filial.urlLocalTrier}`,
      );
    });

    const today = this.toISODate(new Date());
    const dMinus1 = this.addDays(today, -1);

    const processFilial = async ({
      token,
      url,
      filial,
    }: AuthOk): Promise<{
      filial: number;
      lastUpdatedDate: string | null;
    }> => {
      // Contexto exclusivo desta filial
      const executionContext = bigCharge
        ? context.createChild({
            logLevel: 'WARN_ERROR',
            maxLogs: 1000,
          })
        : context;

      const last = await this.prisma.trierParcela.aggregate({
        where: { filialId: filial },
        _max: { dataEmissao: true },
      });

      const startBase = last._max.dataEmissao
        ? this.toISODate(new Date(last._max.dataEmissao))
        : '2026-01-01';

      const start = this.addDays(startBase, 1);

      if (this.diffDays(start, dMinus1) > 10 && !bigCharge) {
        const error = new Error(
          `Periodo muito grande. Reinicie o CronJob no modo BigCharge`,
        ) as Error & {
          obj?: {
            code: string;
          };
        };

        error.obj = {
          code: '02',
        };

        throw error;
      }

      if (this.diffDays(start, dMinus1) < 0) {
        return {
          filial,
          lastUpdatedDate: startBase,
        };
      }

      let current = start;
      const progressKey = `TrierParc-${filial}`;
      try {
        await executionContext.startDateProgress(progressKey, start, dMinus1);
        while (this.diffDays(current, dMinus1) >= 0) {
          this.logger.log(`ETL Trier Parc filial ${filial} - dia ${current}`);

          await executionContext.info(
            'PIPELINE',
            `Pipeline iniciada filial ${filial} - dia ${current}`,
          );

          await this.pipeline.execute(
            {
              date: current,
              tokenLocalTrier: token,
              urlLocalTrier: url,
            },
            executionContext,
          );
          await executionContext.updateDateProgress(progressKey, current);
          current = this.addDays(current, 1);
        }

        return {
          filial,
          lastUpdatedDate: dMinus1,
        };
      } finally {
        if (bigCharge) {
          await context.merge(executionContext);
          executionContext.logs.length = 0;
        }
      }
    };

    let resultsLastDates: Array<{
      filial: number;
      lastUpdatedDate: string | null;
    }>;

    if (bigCharge) {
      // Processa todas as filiais simultaneamente
      resultsLastDates = await Promise.all(
        tokensFinal.map((token) => processFilial(token)),
      );
    } else {
      // Mantém o comportamento atual (sequencial)
      resultsLastDates = [];

      for (const token of tokensFinal) {
        resultsLastDates.push(await processFilial(token));
      }
    }

    return {
      lastUpdatedByFilial: resultsLastDates,
    };
  }

  async executeByFilialAndDate(
    params: {
      filialId: number;
      date: string; // formato YYYY-MM-DD
    },
    context: JobExecutionContext,
  ) {
    const { filialId, date } = params;

    // 1) Buscar filial
    const filial = await this.filialService.findOne(filialId);

    if (!filial) {
      throw new Error(`Filial ${filialId} não encontrada`);
    }

    // 2) Autenticar (com retry opcional)

    const tokenData = await this.authWithRetry(filial, {
      maxAttempts: 4,
      delayMs: 800,
    });

    // 3) Executar ETL
    this.logger.log(`ETL Parc manual filial ${filialId} - dia ${date}`);
    context.info(
      'PIPELINE',
      `Pipeline iniciada filial${filial.name} - dia ${date}`,
    );
    await this.pipeline.execute(
      {
        date,
        tokenLocalTrier: tokenData.token,
        urlLocalTrier: tokenData.url,
      },
      context,
    );
  }
}
