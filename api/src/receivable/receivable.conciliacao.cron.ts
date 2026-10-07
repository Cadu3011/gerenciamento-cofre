import { Inject, Injectable } from '@nestjs/common';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';
import { RunJobQueryDto } from 'src/jobs/dto/runCronJob.dto';
import { ReceivableConciliacaoService } from './receivable.conciliacao.service';

/**
 * Confirma os recebimentos enviados ao ERP.
 *
 * O `ReceivableCron` gera o recebível e o manda para o Trier; este job faz a
 * metade que faltava: volta no ERP, lê o status da movimentação e grava se
 * bateu com o extrato (`CONCILIADO`), se divergiu (`DIVERGENTE`) ou se ainda
 * não houve baixa (`ENVIADO_ERP`).
 *
 * Tem `@Cron` de propósito, ao contrário de `TrierDevolucao`: é rotina
 * diária, não manutenção pontual.
 */
@Injectable()
export class ReceivableConciliacaoCron {
  @Inject()
  private readonly conciliacao: ReceivableConciliacaoService;

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
    const today = this.toISODate(new Date());

    // =========================================================
    // DATE
    // =========================================================

    if (options.period === 'DATE') {
      return {
        start: options.retryStartDate ?? options.date,
        end: options.date,
      };
    }

    // =========================================================
    // RANGE
    // =========================================================

    if (options.period === 'RANGE') {
      return {
        start: options.retryStartDate ?? options.startDate,
        end: options.endDate,
      };
    }

    // =========================================================
    // AUTO — janela de 3 dias até hoje
    //
    // Volta três dias porque a baixa no ERP não é no mesmo instante do
    // lançamento: o recebível é criado às 01:00 e o dinheiro cai no extrato
    // durante o dia, muitas vezes no dia seguinte. Fechar em D-1 deixaria de
    // fora a baixa que aconteceu hoje; a janela para trás é o que deixa o
    // próximo job remarcar o que ontem ainda estava sem baixa.
    // =========================================================

    const start = options.retryStartDate
      ? options.retryStartDate
      : options.bigCharge
        ? '2026-03-31'
        : this.addDays(today, -3);

    return { start, end: today };
  }

  async execute(context: JobExecutionContext, options: RunJobQueryDto = {}) {
    const { start, end } = this.resolvePeriod(options);

    if (this.diffDays(start, end) > 10 && !options.bigCharge) {
      const error = new Error(
        'Periodo muito grande. Reinicie o CronJob no modo BigCharge',
      ) as Error & {
        obj?: { code: string };
      };

      error.obj = { code: '02' };
      throw error;
    }

    context.startStep('CONFIRM');
    const resumo = await this.conciliacao.conciliarJanela(start, end, context);

    await context.endStep(
      'CONFIRM',
      resumo.pendentes
        ? `Janela ${start} a ${end}: ${resumo.pendentes} pendente(s), ` +
            `${resumo.conciliados} conciliado(s), ${resumo.divergentes} divergente(s), ` +
            `${resumo.aguardando} aguardando baixa, ${resumo.naoEncontrados} não encontrado(s), ` +
            `${resumo.semStatus} sem status, ${resumo.semValorBaixa} sem valorBaixa. ` +
            `ERP: ${resumo.chamadasFiltrar} busca(s) de período` +
            `${resumo.chamadasDetalhe ? ` + ${resumo.chamadasDetalhe} detalhe(s)` : ''}.`
        : `Nenhum recebimento pendente de confirmação em ${start} a ${end}`,
    );

    return resumo;
  }
}
