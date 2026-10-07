import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';
import { ReceivableTrierService } from './receivable.trier.service';
import {
  MovimentoNormalizado,
  ReceivableErpClient,
  normalizarMovimento,
} from './receivable.erp.client';

/**
 * Margem aceita entre o valor esperado e o que caiu no extrato.
 *
 * A movimentação é criada no ERP com `valorLancamento = valorEsperado`, então
 * qualquer diferença acima disso é ajuste feito à mão lá dentro — e 10
 * centavos não é ajuste, é arredondamento de taxa.
 */
export const TOLERANCIA_VALOR = 0.1;

/** Casas decimais dos valores gravados. */
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * `dataRecebimento` em AAAA-MM-DD.
 *
 * Usa as partes UTC porque um `@db.Date` pode voltar como meia-noite local ou
 * meia-noite UTC dependendo do driver, e `toLocale*` desloca o dia inteiro —
 * é o mesmo problema de data que já apareceu em `TrierParcela.dataEmissao`.
 */
function paraDataISO(data: Date): string {
  const aaaa = String(data.getUTCFullYear()).padStart(4, '0');
  const mm = String(data.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(data.getUTCDate()).padStart(2, '0');
  return `${aaaa}-${mm}-${dd}`;
}

export type ResumoConciliacaoRecebimentos = {
  /** Recebíveis da janela que ainda estavam em `ENVIADO_ERP`. */
  pendentes: number;
  conciliados: number;
  divergentes: number;
  /** Movimento no ERP ainda `NAO_EFETIVADO`: ninguém deu baixa. */
  aguardando: number;
  /** Id gravado não apareceu em nenhuma data da janela. */
  naoEncontrados: number;
  /** Achou o movimento, mas nem a lista nem o detalhe trouxeram `status`. */
  semStatus: number;
  /** `EFETIVADO` no ERP, porém sem `valorBaixa` — não há o que comparar. */
  semValorBaixa: number;
  chamadasFiltrar: number;
  chamadasDetalhe: number;
};

@Injectable()
export class ReceivableConciliacaoService {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject()
  private readonly erp: ReceivableErpClient;

  @Inject()
  private readonly trier: ReceivableTrierService;

  /**
   * Confere contra o ERP os recebíveis já enviados de uma janela.
   *
   * Só pega `status = 'ENVIADO_ERP'` — `CONCILIADO` e `DIVERGENTE` são
   * terminais, então repetir o job não refaz quem já foi resolvido, e `force`
   * não muda isso de propósito.
   */
  async conciliarJanela(
    start: string,
    end: string,
    context: JobExecutionContext,
  ): Promise<ResumoConciliacaoRecebimentos> {
    const resumo: ResumoConciliacaoRecebimentos = {
      pendentes: 0,
      conciliados: 0,
      divergentes: 0,
      aguardando: 0,
      naoEncontrados: 0,
      semStatus: 0,
      semValorBaixa: 0,
      chamadasFiltrar: 0,
      chamadasDetalhe: 0,
    };

    const pendentes = await this.prisma.receivable.findMany({
      where: {
        dataRecebimento: {
          gte: new Date(`${start}T00:00:00.000Z`),
          lte: new Date(`${end}T23:59:59.999Z`),
        },
        movimentoTrierId: { not: null },
        status: 'ENVIADO_ERP',
      },
      select: {
        id: true,
        dataRecebimento: true,
        valorEsperado: true,
        movimentoTrierId: true,
      },
      orderBy: [{ dataRecebimento: 'asc' }, { id: 'asc' }],
    });

    resumo.pendentes = pendentes.length;

    if (!pendentes.length) {
      // O cron inicia e encerra `CONFIRM`; aqui só saímos.
      return resumo;
    }

    // Uma única autenticação para a janela inteira.
    const token = await this.trier.getToken();

    // =========================================================
    // EXTRACT
    //
    // Uma chamada por data da janela, e só para as datas que têm pendente.
    // O mapa é global: o movimento de um recebível pode ter sido lançado com
    // uma data diferente da `dataRecebimento`, e casar por id resolve sem
    // depender disso.
    // =========================================================

    context.startStep('EXTRACT');

    const movimentos = new Map<number, MovimentoNormalizado>();
    const datas = [
      ...new Set(pendentes.map((p) => paraDataISO(p.dataRecebimento))),
    ].sort();

    for (const data of datas) {
      const linhas = await this.erp.listarPorData(data, token);
      resumo.chamadasFiltrar++;

      for (const linha of linhas) {
        const mov = normalizarMovimento(linha);
        if (mov) movimentos.set(mov.id, mov);
      }

      await context.incrementExtracted(linhas.length);
    }

    await context.endStep(
      'EXTRACT',
      `${movimentos.size} movimento(s) de recebimento lidos em ${datas.length} data(s), ${resumo.chamadasFiltrar} chamada(s) ao ERP`,
    );

    // =========================================================
    // TRANSFORM
    //
    // Dois buracos conhecidos na lista do `/filtrar`:
    //
    //  - id não está lá: ou o lançamento não existe mais, ou o filtro de data
    //    do ERP é por outra coluna que a nossa;
    //  - `status` não está lá: o shape da lista nunca foi lido no código além
    //    do `id`, então só dá para saber na primeira execução. Aí o
    //    `detalhar/{id}` cobre — uma chamada só para os afetados.
    // =========================================================

    context.startStep('TRANSFORM');

    const resolucoes: {
      recebivelId: number;
      movimentoId: number;
      esperado: number;
      /** `null` = não deu para saber o status. */
      movimento: MovimentoNormalizado | null;
      /** Por que não deu, para o log. */
      motivo?: string;
    }[] = [];

    for (const pendente of pendentes) {
      const movimentoId = pendente.movimentoTrierId as number;
      let movimento = movimentos.get(movimentoId);

      if (movimento && !movimento.status) {
        resumo.chamadasDetalhe++;

        const detalhe = await this.erp.detalhar(movimentoId, token);
        const corpo = detalhe?.movimentacao ?? detalhe;
        const normalizado = normalizarMovimento(corpo);

        if (normalizado) {
          normalizado.viaDetalhe = true;
          movimento = normalizado;
        }
      }

      let motivo: string | undefined;

      if (!movimento) {
        motivo = 'id não apareceu na lista';
        resumo.naoEncontrados++;
      } else if (!movimento.status) {
        movimento = null;
        motivo = 'sem status nem no detalhe';
        resumo.semStatus++;
      }

      resolucoes.push({
        recebivelId: pendente.id,
        movimentoId,
        esperado: Number(pendente.valorEsperado),
        movimento,
        motivo,
      });
    }

    await context.endStep(
      'TRANSFORM',
      `${resolucoes.length} recebimento(s) mapeado(s) para o ERP` +
        `${resumo.naoEncontrados ? `, ${resumo.naoEncontrados} id(s) ausente(s)` : ''}` +
        `${resumo.semStatus ? `, ${resumo.semStatus} sem status` : ''}` +
        `${resumo.chamadasDetalhe ? `, ${resumo.chamadasDetalhe} detalhe(s) consultado(s)` : ''}`,
    );

    // =========================================================
    // LOAD
    //
    // `diferenca` guarda a diferença de verdade, mesmo quando ela coube na
    // tolerância: quem quiser ver quanto arredondamento sobrou tem o número.
    // A tolerância decide só o status.
    // =========================================================

    context.startStep('LOAD');

    const atualizacoes: {
      id: number;
      status: 'CONCILIADO' | 'DIVERGENTE';
      valorRecebido: number;
      diferenca: number;
    }[] = [];

    for (const r of resolucoes) {
      if (!r.movimento) continue;

      if (!r.movimento.efetivado) {
        // `NAO_EFETIVADO`: o lançamento existe mas ninguém deu baixa. Não
        // muda status — continua `ENVIADO_ERP` e o próximo job confere de
        // novo, sem categoria nova.
        resumo.aguardando++;
        continue;
      }

      if (r.movimento.valorBaixa === null) {
        resumo.semValorBaixa++;
        await context.warn(
          'LOAD',
          `Movimento ${r.movimentoId} EFETIVADO sem valorBaixa (status "${r.movimento.status}") — sem valor não há o que comparar`,
        );
        continue;
      }

      const diferenca = round2(r.movimento.valorBaixa - r.esperado);
      const conciliado = Math.abs(diferenca) <= TOLERANCIA_VALOR;

      if (conciliado) resumo.conciliados++;
      else resumo.divergentes++;

      atualizacoes.push({
        id: r.recebivelId,
        status: conciliado ? 'CONCILIADO' : 'DIVERGENTE',
        valorRecebido: r.movimento.valorBaixa,
        diferenca,
      });
    }

    if (atualizacoes.length) {
      await this.prisma.$transaction(
        atualizacoes.map((a) =>
          this.prisma.receivable.update({
            where: { id: a.id },
            data: {
              status: a.status,
              valorRecebido: a.valorRecebido,
              diferenca: a.diferenca,
            },
          }),
        ),
      );
    }

    if (resumo.naoEncontrados) {
      const amostra = resolucoes
        .filter((r) => r.motivo === 'id não apareceu na lista')
        .slice(0, 5)
        .map((r) => `movimento ${r.movimentoId}`);

      await context.warn(
        'LOAD',
        `${resumo.naoEncontrados} movimento(s) do ERP não apareceram na lista do período. Amostra: ${amostra.join(', ')}`,
      );
    }

    if (resumo.semStatus) {
      const amostra = resolucoes
        .filter((r) => r.motivo === 'sem status nem no detalhe')
        .slice(0, 5)
        .map((r) => `movimento ${r.movimentoId}`);

      await context.warn(
        'LOAD',
        `${resumo.semStatus} movimento(s) sem status legível. Confira o shape de /movimentacoes/filtrar. Amostra: ${amostra.join(', ')}`,
      );
    }

    await context.endStep(
      'LOAD',
      `${resumo.conciliados} conciliado(s), ${resumo.divergentes} divergente(s), ${resumo.aguardando} aguardando baixa` +
        `${resumo.semValorBaixa ? `, ${resumo.semValorBaixa} EFETIVADO(s) sem valorBaixa` : ''}`,
    );

    return resumo;
  }
}
