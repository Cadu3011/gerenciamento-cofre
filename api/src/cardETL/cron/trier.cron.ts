import { Inject, Injectable } from '@nestjs/common';
import { CardETLPipeline } from '../pipeline/card-etl.pipeline.ts';
import { authTrier } from 'src/auth/authTrier/loginTrier';
import { FilialService } from 'src/filial/filial.service';
import { PrismaService } from 'src/database/prisma.service';
import { Cron } from '@nestjs/schedule';

type AuthOk = { filial: number; url: string; token: string };
type AuthFail = { filial: number; url: string; error: unknown };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

@Injectable()
export class CardCron {
  @Inject()
  private readonly pipeline: CardETLPipeline;

  @Inject()
  private readonly filialService: FilialService;

  @Inject()
  private readonly prisma: PrismaService;

  @Cron('10,57 6,8,15,16 * * 1-7')
  async cron() {
    const today = new Date().toISOString().split('T')[0];
    let job;
    try {
      job = await this.prisma.cronJobETL.upsert({
        where: {
          jobName_runDate: { jobName: 'TrierCards', runDate: new Date(today) },
          status: 'RUNNING',
        },
        create: {
          jobName: 'TrierCards',
          status: 'RUNNING',
          message: '',
          runDate: new Date(today),
        },
        update: {
          message: 'Retentativa',
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        console.log('Job ja finalizado');
        return;
      }
    }
    try {
      await this.execute();
      const finishedAt = new Date();
      await this.prisma.cronJobETL.update({
        where: { id: job.id },
        data: {
          status: 'SUCCESS',
          finishedAt,
        },
      });
    } catch (error) {
      console.log(error);
      const finishedAt = new Date();

      await this.prisma.cronJobETL.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          message: error.message,
          finishedAt,
        },
      });
    }
  }

  private async authOnce(filial: {
    id: number;
    urlLocalTrier: string;
  }): Promise<AuthOk> {
    const token = await authTrier(
      { login: '95', password: 'cadu3011' },
      filial.urlLocalTrier,
    );

    return { filial: filial.id, url: filial.urlLocalTrier, token };
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

  async execute() {
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
        console.log(
          `[AUTH FAIL 1ª] filial=${filial.id} url=${filial.urlLocalTrier}`,
          r.reason,
        );
      }
    });

    // 2) Só depois que terminou TODO MUNDO da 1ª rodada, retenta as falhas
    let retriedOk: AuthOk[] = [];
    if (authFailed.length) {
      console.log(
        `Iniciando retentativas de auth para ${authFailed.length} filiais...`,
      );

      const retried = await this.authWithRetriesAfter(authFailed, {
        maxAttempts: 3,
        baseDelayMs: 800,
      });

      retriedOk = retried.ok;

      if (retried.fail.length) {
        console.log(
          `Auth falhou definitivamente em ${retried.fail.length} filiais:`,
        );
        retried.fail.forEach((f) =>
          console.log(
            `[AUTH FAIL FINAL] filial=${f.filial} url=${f.url}`,
            f.error,
          ),
        );
      }
    }

    const tokensFinal = [...authOk, ...retriedOk];

    const today = this.toISODate(new Date());
    const dMinus1 = this.addDays(today, -1);

    const resultsLastDates: Array<{
      filial: number;
      lastUpdatedDate: string | null;
    }> = [];

    for (const { token, url, filial } of tokensFinal) {
      // pega a última data processada PRA ESSA FILIAL
      const last = await this.prisma.trierCartaoVendas.aggregate({
        where: { filialId: filial },
        _max: { dataEmissao: true },
      });

      // se não tem nada ainda, você decide um "start" inicial
      const startBase = last._max.dataEmissao
        ? this.toISODate(new Date(last._max.dataEmissao))
        : '2026-02-11'; // seu initDate (primeira carga)

      // datas faltantes = (startBase + 1) ... D-1
      const start = this.addDays(startBase, 1);

      // se start > D-1, não tem nada a fazer
      if (this.diffDays(start, dMinus1) < 0) {
        resultsLastDates.push({ filial, lastUpdatedDate: startBase });
        continue;
      }

      // roda dia a dia
      let current = start;
      while (this.diffDays(current, dMinus1) >= 0) {
        console.log(`ETL filial ${filial} - dia ${current}`);

        await this.pipeline.execute({
          date: current,
          tokenLocalTrier: token,
          urlLocalTrier: url,
        });

        current = this.addDays(current, 1);
      }

      resultsLastDates.push({ filial, lastUpdatedDate: dMinus1 });
    }

    return { lastUpdatedByFilial: resultsLastDates };
  }
}
