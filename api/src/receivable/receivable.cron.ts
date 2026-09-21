import { Inject, Injectable } from '@nestjs/common';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';
import { RunJobQueryDto } from 'src/jobs/dto/runCronJob.dto';
import { ReceivableGenerateService } from './receivable.generate.service';
import { ReceivableTrierService } from './receivable.trier.service';

@Injectable()
export class ReceivableCron {
  @Inject()
  private readonly generateService: ReceivableGenerateService;

  @Inject()
  private readonly trierService: ReceivableTrierService;

  private toISODate(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  private addDays(dateStr: string, days: number) {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    d.setDate(d.getDate() + days);
    return this.toISODate(d);
  }

  private diffDays(from: string, to: string) {
    const a = new Date(`${from}T00:00:00.000Z`).getTime();
    const b = new Date(`${to}T00:00:00.000Z`).getTime();
    return Math.floor((b - a) / (1000 * 60 * 60 * 24));
  }

  private resolvePeriod(options: RunJobQueryDto): {
    start: string;
    end: string;
  } {
    if (options.period === 'DATE') {
      return {
        start: options.date,
        end: options.date,
      };
    }

    if (options.period === 'RANGE') {
      return {
        start: options.startDate,
        end: options.endDate,
      };
    }

    const today = this.toISODate(new Date());
    const dMinus1 = this.addDays(today, -1);
    const start = options.bigCharge ? '2026-03-31' : dMinus1;

    return {
      start,
      end: dMinus1,
    };
  }

  async execute(context: JobExecutionContext, options: RunJobQueryDto = {}) {
    const { start, end } = this.resolvePeriod(options);
    const totalDias = this.diffDays(start, end) + 1;

    if (this.diffDays(start, end) > 10 && !options.bigCharge) {
      const error = new Error(
        'Periodo muito grande. Reinicie o CronJob no modo BigCharge',
      ) as Error & {
        obj?: { code: string };
      };

      error.obj = { code: '02' };

      throw error;
    }

    await context.startDateProgress('Recebimento', start, end);

    let totalRecebimentos = 0;
    let totalEnviados = 0;
    let totalFalhas = 0;
    const errors: string[] = [];

    let current = start;
    while (this.diffDays(current, end) >= 0) {
      try {
        context.startStep('GENERATE');
        const recebimentos = await this.generateService.generate(current);
        await context.endStep(
          'GENERATE',
          `Recebimentos gerados para ${current}: ${recebimentos.length} registros`,
        );
        totalRecebimentos += recebimentos.length;

        context.startStep('SEND');
        let enviados = 0;
        let falhas = 0;

        for (const rec of recebimentos) {
          try {
            await this.trierService.send(rec.id);
            enviados++;
          } catch (e) {
            falhas++;
            await context.warn(
              'SEND',
              `Erro enviando filial ${rec.filialId} ${rec.adquirente}: ${(e as Error).message}`,
            );
          }
        }

        totalEnviados += enviados;
        totalFalhas += falhas;
        await context.endStep(
          'SEND',
          `Envio ao Trier para ${current}: ${enviados} enviados, ${falhas} falhas`,
        );

        await context.updateDateProgress('Recebimento', current);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const log = `Data ${current} - ${message}`;
        errors.push(log);
        await context.error('RECEBIMENTO', log);
      }

      current = this.addDays(current, 1);
    }

    if (errors.length > 0) {
      throw new Error(`${errors.length} recebimentos falharam`);
    }

    return {
      dias: totalDias,
      recebimentos: totalRecebimentos,
      enviados: totalEnviados,
      falhas: totalFalhas,
    };
  }
}