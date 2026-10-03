import { Inject, Injectable, Logger } from '@nestjs/common';
import { OrigemConciliacao, Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

type FatoKey = string;

interface FatoRow {
  dataISO: string;
  filialId: number;
  adquirente: OrigemConciliacao;
  bandeira: string;
  valorBruto: number;
  valorLiquido: number;
  taxa: number;
  quantidade: number;
  valorConciliado: number;
  valorDivergente: number;
  valorPendente: number;
  qtdConciliado: number;
  qtdDivergente: number;
  qtdPendente: number;
}

interface FindFatoParams {
  startDate: string;
  endDate: string;
  filialId?: number;
  adquirente?: OrigemConciliacao;
  bandeira?: string;
}

/**
 * Situação da conciliação escolhida no filtro. Cada opção traz uma coluna
 * própria, somada nos cards, gráficos e rankings:
 *
 *  - `PENDENTE`   -> `valorPendente`
 *  - `DIVERGENTE` -> `valorDivergente`
 *  - `CONCILIADO` -> `valorConciliado`
 *
 * Sem opção, a métrica é `valorBruto`.
 */
export type FatoStatus = 'PENDENTE' | 'DIVERGENTE' | 'CONCILIADO';

/** Colunas do fato, usadas como métrica conforme o filtro de situação. */
type ColunaMetrica =
  | 'valorBruto'
  | 'valorPendente'
  | 'valorDivergente'
  | 'valorConciliado';

const COLUNA_POR_STATUS: Record<FatoStatus, ColunaMetrica> = {
  PENDENTE: 'valorPendente',
  DIVERGENTE: 'valorDivergente',
  CONCILIADO: 'valorConciliado',
};

interface DashboardFatoParams {
  startDate: string;
  endDate: string;
  filialId?: number;
  /** Origens selecionadas. Vazio/ausente = todas. */
  adquirentes?: OrigemConciliacao[];
  bandeiras?: string[];
  bandeirasModo?: 'incluir' | 'excluir';
  /** Situações selecionadas. Vazio/ausente = bruto. */
  status?: FatoStatus[];
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class FatoCartaoParcelasService {
  @Inject()
  private readonly prisma: PrismaService;

  private readonly logger = new Logger(FatoCartaoParcelasService.name);

  private toISODate(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  private getRow(
    map: Map<FatoKey, FatoRow>,
    dataISO: string,
    filialId: number,
    adquirente: OrigemConciliacao,
    bandeira: string,
  ): FatoRow {
    const key = `${dataISO}|${filialId}|${adquirente}|${bandeira}`;
    let row = map.get(key);
    if (!row) {
      row = {
        dataISO,
        filialId,
        adquirente,
        bandeira,
        valorBruto: 0,
        valorLiquido: 0,
        taxa: 0,
        quantidade: 0,
        valorConciliado: 0,
        valorDivergente: 0,
        valorPendente: 0,
        qtdConciliado: 0,
        qtdDivergente: 0,
        qtdPendente: 0,
      };
      map.set(key, row);
    }
    return row;
  }

  private aplicarStatus(
    row: FatoRow,
    status: string,
    valor: number,
    quantidade: number,
  ) {
    row.valorBruto += valor;
    row.quantidade += quantidade;

    switch (status) {
      case 'CONCILIADO':
        row.valorConciliado += valor;
        row.qtdConciliado += quantidade;
        break;
      case 'DIVERGENTE':
        row.valorDivergente += valor;
        row.qtdDivergente += quantidade;
        break;
      default:
        row.valorPendente += valor;
        row.qtdPendente += quantidade;
        break;
    }
  }

  async refreshPeriod(
    start: string,
    end: string,
    context: JobExecutionContext,
  ) {
    const startD = new Date(`${start}T00:00:00.000Z`);
    const endD = new Date(`${end}T00:00:00.000Z`);
    const map = new Map<FatoKey, FatoRow>();
    let currentStep = '';

    try {
      currentStep = 'AGGREGATE';
      context.startStep(currentStep);

      const [trier, rede, cielo] = await Promise.all([
        this.prisma.trierParcela.groupBy({
          by: ['dataEmissao', 'filialId', 'bandeira', 'statusConciliacao'],
          where: { dataEmissao: { gte: startD, lte: endD } },
          _sum: { valor: true, valorLiquido: true, valorTaxas: true },
          _count: { _all: true },
        }),
        this.prisma.redeParcela.groupBy({
          by: ['dataVenda', 'filialId', 'statusConciliacao'],
          where: { dataVenda: { gte: startD, lte: endD } },
          _sum: { valor: true, valorLiquido: true, taxa: true },
          _count: { _all: true },
        }),
        this.prisma.cieloParcela.groupBy({
          by: ['dataVenda', 'filialId', 'bandeira', 'statusConciliacao'],
          where: { dataVenda: { gte: startD, lte: endD } },
          _sum: { valor: true, valorLiquido: true, taxaAdministrativa: true },
          _count: { _all: true },
        }),
      ]);

      for (const g of trier) {
        const dataISO = this.toISODate(new Date(g.dataEmissao));
        const row = this.getRow(
          map,
          dataISO,
          g.filialId,
          'TRIER',
          g.bandeira ?? '',
        );
        row.valorLiquido += Number(g._sum.valorLiquido ?? 0);
        row.taxa += Number(g._sum.valorTaxas ?? 0);
        this.aplicarStatus(
          row,
          g.statusConciliacao,
          Number(g._sum.valor ?? 0),
          g._count._all,
        );
      }

      for (const g of rede) {
        const dataISO = this.toISODate(new Date(g.dataVenda));
        const row = this.getRow(map, dataISO, g.filialId, 'REDE', '');
        row.valorLiquido += Number(g._sum.valorLiquido ?? 0);
        row.taxa += Number(g._sum.taxa ?? 0);
        this.aplicarStatus(
          row,
          g.statusConciliacao,
          Number(g._sum.valor ?? 0),
          g._count._all,
        );
      }

      for (const g of cielo) {
        const dataISO = this.toISODate(new Date(g.dataVenda));
        const row = this.getRow(
          map,
          dataISO,
          g.filialId,
          'CIELO',
          g.bandeira ?? '',
        );
        row.valorLiquido += Number(g._sum.valorLiquido ?? 0);
        row.taxa += Number(g._sum.taxaAdministrativa ?? 0);
        this.aplicarStatus(
          row,
          g.statusConciliacao,
          Number(g._sum.valor ?? 0),
          g._count._all,
        );
      }

      await context.endStep(
        currentStep,
        `${map.size} linhas agregadas (Trier ${trier.length}, Rede ${rede.length}, Cielo ${cielo.length})`,
      );

      currentStep = 'LOAD';
      context.startStep(currentStep);

      const { apagadas, inseridas } = await this.persist(startD, endD, map);
      await context.endStep(
        currentStep,
        `${inseridas} linhas gravadas, ${apagadas} apagadas`,
      );

      return {
        linhas: map.size,
        apagadas,
        inseridas,
      };
    } catch (error: any) {
      await context.error(
        currentStep || 'PIPELINE',
        error?.message ?? 'Erro desconhecido',
      );
      throw error;
    }
  }

  private async persist(startD: Date, endD: Date, map: Map<FatoKey, FatoRow>) {
    const rows = Array.from(map.values()).map((r) => ({
      data: new Date(`${r.dataISO}T00:00:00.000Z`),
      filialId: r.filialId,
      adquirente: r.adquirente,
      bandeira: r.bandeira.slice(0, 80),
      valorBruto: round2(r.valorBruto),
      valorLiquido: round2(r.valorLiquido),
      taxa: round2(r.taxa),
      quantidade: r.quantidade,
      valorConciliado: round2(r.valorConciliado),
      valorDivergente: round2(r.valorDivergente),
      valorPendente: round2(r.valorPendente),
      qtdConciliado: r.qtdConciliado,
      qtdDivergente: r.qtdDivergente,
      qtdPendente: r.qtdPendente,
    }));

    let apagadas = 0;
    let inseridas = 0;
    const BATCH = 1000;

    await this.prisma.$transaction(
      async (tx) => {
        const del = await tx.fatoCartaoParcelas.deleteMany({
          where: { data: { gte: startD, lte: endD } },
        });
        apagadas = del.count;

        for (let i = 0; i < rows.length; i += BATCH) {
          const created = await tx.fatoCartaoParcelas.createMany({
            data: rows.slice(i, i + BATCH),
          });
          inseridas += created.count;
        }
      },
      {
        timeout: 60_000,
      },
    );

    return { apagadas, inseridas };
  }

  async findByPeriod(params: FindFatoParams) {
    const startD = new Date(`${params.startDate}T00:00:00.000Z`);
    const endD = new Date(`${params.endDate}T00:00:00.000Z`);

    return this.prisma.fatoCartaoParcelas.findMany({
      where: {
        data: { gte: startD, lte: endD },
        ...(params.filialId && { filialId: params.filialId }),
        ...(params.adquirente && { adquirente: params.adquirente }),
        ...(params.bandeira && { bandeira: params.bandeira }),
      },
      include: {
        filial: { select: { id: true, name: true } },
      },
      orderBy: [
        { data: 'asc' },
        { filialId: 'asc' },
        { adquirente: 'asc' },
        { bandeira: 'asc' },
      ],
    });
  }

  /**
   * Filtro do dashboard.
   *
   * A origem é multi-seleção: `adquirentes` vazio/ausente = todas.
   *
   * Uma regra não é óbvia: **a Rede nunca é filtrada por bandeira.** A tabela
   * de parcelas da Rede não tem coluna `bandeira` (ela só existe para o fato),
   * então toda linha da Rede cairia fora de um `in`/`notIn` e o filtro
   * esvaziaria o comparativo. Por isso o ramo `adquirente: 'REDE'` do `OR`:
   * as parcelas da Rede continuam sendo retornadas mesmo com bandeiras
   * selecionadas, e simplesmente não são filtráveis por bandeira.
   */
  private buildDashboardWhere(
    params: DashboardFatoParams,
    startD: Date,
    endD: Date,
    applyFilialId: boolean,
  ): Prisma.FatoCartaoParcelasWhereInput {
    const origens = params.adquirentes?.length ? params.adquirentes : undefined;

    return {
      data: { gte: startD, lte: endD },
      ...(applyFilialId && params.filialId && { filialId: params.filialId }),
      ...(origens?.length && { adquirente: { in: origens } }),
      ...(params.bandeiras?.length && {
        OR: [
          { adquirente: 'REDE' },
          {
            bandeira:
              params.bandeirasModo === 'incluir'
                ? { in: params.bandeiras }
                : { notIn: params.bandeiras },
          },
        ],
      }),
    };
  }

  /**
   * Colunas somadas conforme o filtro de situação.
   *
   * A seleção é múltipla e as colunas se somam entre si: `aplicarStatus` joga
   * cada parcela em **uma** das três colunas, então
   * `conciliado + divergente + pendente = bruto` (verificado no banco, delta
   * 0,00). Marcar "Pendente + Divergente" é, por isso, o mesmo que "todo o
   * menos o conciliado" — sem risco de dupla contagem.
   *
   * Sem seleção, a métrica é `valorBruto`.
   */
  private metricas(params: DashboardFatoParams): ColunaMetrica[] {
    if (!params.status?.length) return ['valorBruto'];
    return [...new Set(params.status.map((s) => COLUNA_POR_STATUS[s]))];
  }

  /** Soma as colunas de métrica de uma linha agregada. */
  private somaMetrica(
    row: { _sum: unknown },
    colunas: ColunaMetrica[],
  ): number {
    const sum = row._sum as Record<string, number | null> | null;
    return colunas.reduce((acc, c) => acc + Number(sum?.[c] ?? 0), 0);
  }

  async dashboard(params: DashboardFatoParams & { somenteMensal?: boolean }) {
    const startD = new Date(`${params.startDate}T00:00:00.000Z`);
    const endD = new Date(`${params.endDate}T23:59:59.999Z`);

    const where = this.buildDashboardWhere(params, startD, endD, true);
    const rankingWhere = this.buildDashboardWhere(params, startD, endD, false);
    const metricas = this.metricas(params);

    // As colunas vêm da lista fechada `COLUNA_POR_STATUS`, então os nomes não
    // são entrada do usuário: é apenas o nome de campos do groupBy.
    const somaMetrica = Object.fromEntries(metricas.map((c) => [c, true])) as {
      [k: string]: true;
    };

    // O gráfico mensal é derivado do mesmo groupBy diário, então uma única
    // consulta resolve. No modo `somenteMensal` as demais agregações são
    // puladas: o gráfico não as usa e elas somam custo à resposta.
    const porDia = await this.prisma.fatoCartaoParcelas.groupBy({
      by: ['data', 'adquirente'],
      where,
      _sum: somaMetrica as any,
    });

    const mapaMes: Record<string, any> = {};

    for (const row of porDia) {
      const mes = this.toISODate(new Date(row.data)).slice(0, 7);
      if (!mapaMes[mes]) {
        mapaMes[mes] = { mes, trier: 0, adquirentes: 0, diferenca: 0 };
      }
      const valor = this.somaMetrica(row, metricas);
      if (row.adquirente === 'TRIER') {
        mapaMes[mes].trier += valor;
      } else {
        mapaMes[mes].adquirentes += valor;
      }
    }

    const chartDiferencaMensal = Object.values(mapaMes)
      .map((d: any) => ({
        ...d,
        diferenca: round2(d.adquirentes - d.trier),
      }))
      .sort((a: any, b: any) => a.mes.localeCompare(b.mes));

    if (params.somenteMensal) {
      return { chartDiferencaMensal } as any;
    }

    const [totais, porFilial] = await Promise.all([
      this.prisma.fatoCartaoParcelas.groupBy({
        by: ['adquirente'],
        where,
        // Além da métrica escolhida, o bruto e as duas colunas usadas pelos
        // KPIs de conciliação continuam somados: são proporções e não devem
        // trocar de sentido com o filtro. `aplicarStatus` joga cada parcela em
        // uma única coluna, então `conciliado + divergente
        // + pendente = bruto`.
        _sum: {
          ...somaMetrica,
          valorBruto: true,
          valorConciliado: true,
          valorPendente: true,
        },
      }),
      this.prisma.fatoCartaoParcelas.groupBy({
        by: ['filialId', 'adquirente'],
        where: rankingWhere,
        _sum: { ...somaMetrica, valorDivergente: true },
      }),
    ]);

    const valor = (adquirente: OrigemConciliacao) => {
      const row = totais.find((t) => t.adquirente === adquirente);
      return row ? this.somaMetrica(row, metricas) : 0;
    };

    const erp = valor('TRIER');
    const adquirentes = valor('REDE') + valor('CIELO');

    const trierRow = totais.find((t) => t.adquirente === 'TRIER');

    const conciliadoValor = Number(trierRow?._sum.valorConciliado ?? 0);
    const pendenteValor = Number(trierRow?._sum.valorPendente ?? 0);

    // Base dos dois percentuais: o bruto inteiro do período, imune ao filtro de
    // situação. `erp` não serve aqui — ele muda com a métrica escolhida, e
    // marcar só "Pendente" encolheria a base para o próprio pendente, fazendo a
    // taxa passar de 100%. Os demais filtros (período, filial, bandeira,
    // origem) continuam valendo: a base é o todo *da seleção*.
    const baseTotal = Number(trierRow?._sum.valorBruto ?? 0);

    // "Não conciliado" é só o que ficou sem match: o bucket PENDENTE.
    // DIVERGENTE não entra — nele a venda foi casada com o registro do
    // adquirente e o que existe é uma observação sobre a comparação, não uma
    // parcela órfã. Somar os dois fazia o indicador refletir o volume da
    // conciliação, não o da falta dela.
    const naoConciliados = pendenteValor;

    const cardsTotals = {
      erp: round2(erp),
      adquirentes: round2(adquirentes),
      diferenca: round2(adquirentes - erp),
      naoConciliados: round2(naoConciliados),
      kpiConciTrier:
        baseTotal > 0
          ? Number(((conciliadoValor / baseTotal) * 100).toFixed(2))
          : 0,
      materialidade:
        baseTotal > 0
          ? Number(((naoConciliados / baseTotal) * 100).toFixed(2))
          : 0,
      divergencias: 0,
    };

    const mapaDia: Record<string, any> = {};

    for (const row of porDia) {
      const dia = this.toISODate(new Date(row.data));
      if (!mapaDia[dia]) {
        mapaDia[dia] = { data: dia, trier: 0, adquirentes: 0, diferenca: 0 };
      }
      const valor = this.somaMetrica(row, metricas);
      if (row.adquirente === 'TRIER') {
        mapaDia[dia].trier += valor;
      } else {
        mapaDia[dia].adquirentes += valor;
      }
    }

    const chartLines = Object.values(mapaDia)
      .map((d: any) => ({
        ...d,
        diferenca: round2(d.adquirentes - d.trier),
      }))
      .sort((a: any, b: any) => a.data.localeCompare(b.data));

    const mapaFilial: Record<
      number,
      { trier: number; adquirentes: number; divergencias: number }
    > = {};

    for (const row of porFilial) {
      const atual =
        mapaFilial[row.filialId] ??
        (mapaFilial[row.filialId] = {
          trier: 0,
          adquirentes: 0,
          divergencias: 0,
        });

      atual.divergencias += Number(row._sum.valorDivergente ?? 0);

      const valor = this.somaMetrica(row, metricas);
      if (row.adquirente === 'TRIER') {
        atual.trier += valor;
      } else {
        atual.adquirentes += valor;
      }
    }

    const ids = Object.keys(mapaFilial).map(Number);
    const filiais = ids.length
      ? await this.prisma.filial.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        })
      : [];

    const filialMap = new Map(filiais.map((f) => [f.id, f.name]));

    const rankingGraos = ids
      .map((id) => {
        const m = mapaFilial[id];
        return {
          filial: filialMap.get(id) ?? `Filial ${id}`,
          filialId: id,
          trier: round2(m.trier),
          adquirentes: round2(m.adquirentes),
          diferenca: round2(m.adquirentes - m.trier),
          valorDivergencias: round2(m.divergencias),
        };
      })
      .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca));

    return {
      cardsTotals,
      chartLines,
      chartDiferencaMensal,
      rankingGraos,
    };
  }

  async getFiltros(): Promise<Record<string, string[]>> {
    const result = await this.prisma.fatoCartaoParcelas.groupBy({
      by: ['adquirente', 'bandeira'],
      where: { bandeira: { not: '' } },
      orderBy: [{ adquirente: 'asc' }, { bandeira: 'asc' }],
    });

    const filtros: Record<string, string[]> = {};
    for (const row of result) {
      if (!filtros[row.adquirente]) {
        filtros[row.adquirente] = [];
      }
      filtros[row.adquirente].push(row.bandeira);
    }
    return filtros;
  }
}
