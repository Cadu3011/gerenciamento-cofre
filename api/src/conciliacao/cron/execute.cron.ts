import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { FilialService } from 'src/filial/filial.service';
import { Pipeline } from './pipeline';

@Injectable()
export class ConciCardsCron {
  @Inject()
  private readonly filialService: FilialService;

  @Inject()
  private readonly prisma: PrismaService;

  @Inject()
  private readonly pipeline: Pipeline;

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
    const today = this.toISODate(new Date());
    const dMinus1 = this.addDays(today, -1);
    const resultsLastDates: Array<{
      filial: number;
      lastUpdatedDate: string | null;
    }> = [];
    for (const f of filiais) {
      const last = await this.prisma.conciliacao.aggregate({
        where: { filialId: f.id },
        _max: { startDate: true },
      });
      // se não tem nada ainda, você decide um "start" inicial
      const startBase = last._max.startDate
        ? this.toISODate(new Date(last._max.startDate))
        : '2026-04-01'; // seu initDate (primeira carga)

      // datas faltantes = (startBase + 1) ... D-1
      const start = this.addDays(startBase, 1);

      // se start > D-1, não tem nada a fazer
      if (this.diffDays(start, dMinus1) < 0) {
        resultsLastDates.push({ filial: f.id, lastUpdatedDate: startBase });
        continue;
      }

      // roda dia a dia
      let current = start;
      while (this.diffDays(current, dMinus1) >= 0) {
        console.log(`ETL filial ${f.name} - dia ${current}`);

        await this.pipeline.execute(f.id, current);

        current = this.addDays(current, 1);
      }

      resultsLastDates.push({ filial: f.id, lastUpdatedDate: dMinus1 });
    }
    return { lastUpdatedByFilial: resultsLastDates };
  }
}
