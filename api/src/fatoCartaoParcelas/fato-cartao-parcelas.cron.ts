import { Inject, Injectable } from '@nestjs/common';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';
import { RunJobQueryDto } from 'src/jobs/dto/runCronJob.dto';
import { FatoCartaoParcelasService } from './fato-cartao-parcelas.service';

@Injectable()
export class FatoCartaoParcelasCron {
  @Inject()
  private readonly fatoService: FatoCartaoParcelasService;

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
    return {
      start: this.addDays(today, -7),
      end: this.addDays(today, -1),
    };
  }

  async execute(context: JobExecutionContext, options: RunJobQueryDto = {}) {
    const { start, end } = this.resolvePeriod(options);

    if (!start || !end) {
      throw new Error('Período não informado.');
    }

    if (this.diffDays(start, end) < 0) {
      throw new Error('Período inválido: data inicial posterior à final.');
    }

    if (this.diffDays(start, end) > 62 && !options.bigCharge) {
      const error = new Error(
        'Periodo muito grande. Reinicie o CronJob no modo BigCharge',
      ) as Error & {
        obj?: { code: string };
      };
      error.obj = { code: '02' };
      throw error;
    }

    await context.startDateProgress('FatoCartaoParcelas', start, end);

    try {
      const resultado = await this.fatoService.refreshPeriod(
        start,
        end,
        context,
      );
      await context.updateDateProgress('FatoCartaoParcelas', end);
      return resultado;
    } catch (error) {
      await context.markProgressError(
        'FatoCartaoParcelas',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}