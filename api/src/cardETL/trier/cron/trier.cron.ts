import { Inject, Injectable, Logger } from '@nestjs/common';
import { TrierCardETLPipeline } from '../pipeline/trier.card-etl.pipeline.js';
import { FilialService } from 'src/filial/filial.service';
import { PrismaService } from 'src/database/prisma.service';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service.js';
import { RunJobQueryDto } from 'src/jobs/dto/runCronJob.dto.js';

type AuthOk = { filial: number; url: string; token: string };
type AuthFail = { filial: number; url: string; error: unknown };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

@Injectable()
export class TrierCardCron {
  @Inject()
  private readonly pipeline: TrierCardETLPipeline;

  @Inject()
  private readonly filialService: FilialService;

  @Inject()
  private readonly prisma: PrismaService;

  private readonly logger = new Logger(TrierCardCron.name);

  private async authOnce(filial: {
    id: number;
    urlLocalTrier: string;
  }): Promise<AuthOk> {
    const { tokenTrier } = await this.prisma.filial.findUnique({
      where: { id: filial.id },
      select: { tokenTrier: true },
    });

    if (!tokenTrier) {
      throw new Error(`Filial ${filial.id} não possui tokenTrier`);
    }

    try {
      const response = await fetch(process.env.API_TRIER_URL!, {
        headers: {
          Authorization: `Bearer ${tokenTrier}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Falha na autenticação da filial ${filial.id}: HTTP ${response.status}`,
        );
      }

      return {
        filial: filial.id,
        url: filial.urlLocalTrier,
        token: tokenTrier,
      };
    } catch (error) {
      throw new Error(
        `Não foi possível conectar/autenticar na Trier da filial ${filial.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async authWithRetriesAfter(
    toRetry: { id: number; urlLocalTrier: string }[],
    opts?: { maxAttempts?: number; baseDelayMs?: number },
  ): Promise<{ ok: AuthOk[]; fail: AuthFail[] }> {
    const maxAttempts = opts?.maxAttempts ?? 3; // total de tentativas (ex: 3 = 1ª retentativa + 2ª + 3ª)
    const baseDelayMs = opts?.baseDelayMs ?? 800;

    let pending = [...toRetry];
    const ok: AuthOk[] = [];
    const failFinal: AuthFail[] = [];

    for (let attempt = 1; attempt <= maxAttempts && pending.length; attempt++) {
      const delay = baseDelayMs * attempt; // backoff simples: 800, 1600, 2400...

      // (opcional) espera antes da rodada de retentativa
      await sleep(delay);

      const round = await Promise.allSettled(
        pending.map(async (filial) => this.authOnce(filial)),
      );

      const nextPending: typeof pending = [];

      round.forEach((r, idx) => {
        const filial = pending[idx];
        if (r.status === 'fulfilled') {
          ok.push(r.value);
        } else {
          nextPending.push(filial);
        }
      });

      pending = nextPending;
    }

    // O que sobrou em pending falhou em todas as tentativas
    if (pending.length) {
      // aqui, se você quiser guardar o erro real de cada uma,
      // dá pra re-executar capturando erro, mas normalmente basta logar.
      failFinal.push(
        ...pending.map((f) => ({
          filial: f.id,
          url: f.urlLocalTrier,
          error: 'Auth falhou após retentativas',
        })),
      );
    }

    return { ok, fail: failFinal };
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

    const last = await this.prisma.trierCartaoVendas.aggregate({
      where: {
        filialId,
      },
      _max: {
        dataEmissao: true,
      },
    });

    const startBase = last._max.dataEmissao
      ? this.toISODate(new Date(last._max.dataEmissao))
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
    const filiais = await this.filialService.findAll();

    // 1) Primeira rodada (todas em paralelo)
    const firstRound = await Promise.allSettled(
      filiais.map(async (filial) => this.authOnce(filial)),
    );

    const authOk: AuthOk[] = [];
    const authFailed: { id: number; urlLocalTrier: string }[] = [];

    firstRound.forEach((r, idx) => {
      const filial = filiais[idx];
      if (r.status === 'fulfilled') {
        authOk.push(r.value);
      } else {
        authFailed.push(filial);
        const reason = r.reason;
        const networkErrors = [
          'ETIMEDOUT',
          'ECONNABORTED',
          'ECONNREFUSED',
          'EHOSTUNREACH',
          'ENETUNREACH',
        ];

        if (networkErrors.includes(reason?.code)) {
          this.logger.error(`[IP NÃO ACESSÍVEL] ${filial.urlLocalTrier}`);

          context.error(
            'CRON',
            `[IP NÃO ACESSÍVEL] ${filial.urlLocalTrier} Filial: ${filial.name}`,
          );

          return;
        }
      }
    });

    // 2) Só depois que terminou TODO MUNDO da 1ª rodada, retenta as falhas
    let retriedOk: AuthOk[] = [];
    if (authFailed.length) {
      this.logger.warn(
        `Iniciando retentativas de auth para ${authFailed.length} filiais...`,
      );
      context.warn(
        'CRON',
        `Iniciando retentativas de auth para ${authFailed.length} filiais...`,
      );

      const retried = await this.authWithRetriesAfter(authFailed, {
        maxAttempts: 3,
        baseDelayMs: 800,
      });

      retriedOk = retried.ok;

      if (retried.fail.length) {
        this.logger.error(
          `Auth falhou definitivamente em ${retried.fail.length} filiais:`,
        );
        context.error(
          'CRON',
          `Auth falhou definitivamente em ${retried.fail.length} filiais:`,
        );
        retried.fail.forEach((f) => {
          (this.logger.error(
            `[AUTH FAIL FINAL] filial=${f.filial} url=${f.url}`,
            f.error,
          ),
            context.error(
              'CRON',
              `[AUTH FAIL FINAL] filial=${f.filial} url=${f.url}`,
            ));
        });
      }
    }

    const tokensFinal = [...authOk, ...retriedOk];

    const processFilial = async ({
      token,
      filial,
    }: AuthOk): Promise<{
      filial: number;
      lastUpdatedDate: string | null;
    }> => {
      const executionContext = options.bigCharge
        ? context.createChild({
            logLevel: 'WARN_ERROR',
            maxLogs: 1000,
          })
        : context;

      try {
        const period = await this.resolvePeriod(filial, options);

        if (!period) {
          return {
            filial,
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
            filial,
            lastUpdatedDate: end,
          };
        }

        const progressKey = `TrierCard-${filial}`;

        await executionContext.startDateProgress(progressKey, start, end);

        let current = start;

        while (this.diffDays(current, end) >= 0) {
          this.logger.log(`ETL Trier Card filial ${filial} - dia ${current}`);

          await executionContext.info(
            'PIPELINE',
            `Pipeline iniciada filial ${filial} - dia ${current}`,
          );

          await this.pipeline.execute(
            {
              date: current,
              tokenLocalTrier: token,
            },
            executionContext,
          );

          await executionContext.updateDateProgress(progressKey, current);

          current = this.addDays(current, 1);
        }

        return {
          filial,
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
      // BigCharge:
      // todas as filiais simultaneamente
      resultsLastDates = await Promise.all(
        tokensFinal.map((token) => processFilial(token)),
      );
    } else {
      // Normal:
      // uma filial por vez
      resultsLastDates = [];

      for (const token of tokensFinal) {
        resultsLastDates.push(await processFilial(token));
      }
    }

    return { lastUpdatedByFilial: resultsLastDates };
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
    let tokenData: AuthOk | null = null;

    try {
      tokenData = await this.authOnce(filial);
    } catch (err) {
      this.logger.warn(`[AUTH FAIL] Tentando retry...`);

      const retry = await this.authWithRetriesAfter([filial], {
        maxAttempts: 3,
        baseDelayMs: 800,
      });

      if (!retry.ok.length) {
        throw new Error(`Falha na autenticação da filial ${filialId}`);
      }

      tokenData = retry.ok[0];
    }

    // 3) Executar ETL
    this.logger.log(`ETL manual filial ${filialId} - dia ${date}`);

    await this.pipeline.execute(
      {
        date,
        tokenLocalTrier: tokenData.token,
      },
      context,
    );

    return {
      success: true,
      filial: filialId,
      date,
    };
  }
}
