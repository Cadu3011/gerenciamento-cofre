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

  async execute(context: JobExecutionContext, bigCharge?: boolean) {
    const filiais = await this.filialService.findAll();
    const today = this.toISODate(new Date());
    const dMinus1 = this.addDays(today, -1);
    const start = bigCharge ? '2026-03-31' : this.addDays(today, -6);
    const errors: string[] = [];
    const totalDias = this.diffDays(start, dMinus1) + 1;

    await context.startDateProgress('ConciParc', start, dMinus1);
    context.startStep('CONCI_PARC');

    const lote = await this.prisma.conciliacaoLote.create({
      data: {
        periodoInicial: new Date(start + 'T00:00:00.000Z'),
        periodoFinal: new Date(dMinus1 + 'T00:00:00.000Z'),
        algoritmoVersao: '1.0',
      },
    });

    let totalGrupos = 0;
    let totalConciliados = 0;
    let totalDivergentes = 0;
    let totalPendentes = 0;

    const processFilial = async (f: { id: number }) => {
      const executionContext = bigCharge
        ? context.createChild({ logLevel: 'WARN_ERROR', maxLogs: 1000 })
        : context;

      let current = start;
      while (this.diffDays(current, dMinus1) >= 0) {
        try {
          await executionContext.info(
            'PIPELINE_PARC',
            `Pipeline parcelas Filial ${f.id} Data ${current}`,
          );
          const result = await this.pipeline.execute(
            current,
            f.id,
            executionContext,
            lote.id,
          );
          totalGrupos += result.total;
          totalConciliados += result.conciliados;
          totalDivergentes += result.divergentes;
          totalPendentes += result.naoEncontrados;
          this.logger.debug(
            `Filial ${f.id} Data ${current} - ${result.total} parcelas (${result.conciliados} conciliadas, ${result.divergentes} divergentes)`,
          );
          await context.updateDateProgress('ConciParc', current);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          const log = `Filial ${f.id} - Data ${current} - ${message}`;
          errors.push(log);
          await executionContext.error('PIPELINE_PARC', log);
        }

        current = this.addDays(current, 1);
      }

      if (bigCharge) {
        await context.merge(executionContext);
        executionContext.logs.length = 0;
      }
    };

    for (const f of filiais) {
      await processFilial(f);
    }

    await this.prisma.conciliacaoLote.update({
      where: { id: lote.id },
      data: {
        totalGrupos,
        conciliados: totalConciliados,
        divergentes: totalDivergentes,
        pendentes: totalPendentes,
      },
    });

    await context.finishProgress('ConciParc');

    this.logger.log(
      `Conciliação parcelas finalizada. Total de erros: ${errors.length}`,
    );

    if (errors.length > 0) {
      this.logger.error(errors.join('\n'));
      throw new Error(`${errors.length} conciliações de parcelas falharam`);
    }

    await context.endStep(
      'CONCI_PARC',
      `Conciliação parcelas finalizada: ${filiais.length} filiais, ${totalDias} dias`,
    );

    return { ok: true };
  }
}
