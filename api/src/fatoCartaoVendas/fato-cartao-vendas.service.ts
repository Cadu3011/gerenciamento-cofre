import { Inject, Injectable, Logger } from '@nestjs/common';
import { OrigemConciliacao } from '@prisma/client';
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

interface DashboardFatoParams {
  startDate: string;
  endDate: string;
  filialId?: number;
  adquirente?: OrigemConciliacao;
  bandeiras?: string[];
  bandeirasModo?: 'incluir' | 'excluir';
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class FatoCartaoVendasService {
  @Inject()
  private readonly prisma: PrismaService;

  private readonly logger = new Logger(FatoCartaoVendasService.name);

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
    const semMapeamento = new Set<string>();
    let currentStep = '';

    try {
      currentStep = 'AGGREGATE';
      context.startStep(currentStep);

      const [trier, rede, cielo, filiais] = await Promise.all([
        this.prisma.trierCartaoVendas.groupBy({
          by: ['dataEmissao', 'filialId', 'bandeira', 'statusConciliacao'],
          where: { dataEmissao: { gte: startD, lte: endD } },
          _sum: { valor: true },
          _count: { _all: true },
        }),
        this.prisma.redeVenda.groupBy({
          by: ['dataVenda', 'filialId', 'bandeira', 'statusConciliacao'],
          where: { dataVenda: { gte: startD, lte: endD } },
          _sum: { valor: true, valorLiquido: true },
          _count: { _all: true },
        }),
        this.prisma.cartaoVendas.groupBy({
          by: ['dataVenda', 'estabelecimento', 'bandeira', 'statusConciliacao'],
          where: { dataVenda: { gte: start, lte: end } },
          _sum: {
            valorBruto: true,
            valorLiquido: true,
            taxaAdministrativa: true,
          },
          _count: { _all: true },
        }),
        this.prisma.filial.findMany({
          select: { id: true, idCielo: true },
        }),
      ]);

      const filialMap = new Map<string, number>();
      for (const f of filiais) {
        if (f.idCielo) filialMap.set(String(f.idCielo).trim(), f.id);
      }

      for (const g of trier) {
        const dataISO = this.toISODate(new Date(g.dataEmissao));
        const row = this.getRow(map, dataISO, g.filialId, 'TRIER', g.bandeira);
        this.aplicarStatus(
          row,
          g.statusConciliacao,
          Number(g._sum.valor ?? 0),
          g._count._all,
        );
      }

      for (const g of rede) {
        const dataISO = this.toISODate(new Date(g.dataVenda));
        const valor = Number(g._sum.valor ?? 0);
        const liquido = Number(g._sum.valorLiquido ?? 0);
        const row = this.getRow(
          map,
          dataISO,
          g.filialId,
          'REDE',
          g.bandeira ?? '',
        );
        row.valorLiquido += liquido;
        row.taxa += round2(valor - liquido);
        this.aplicarStatus(row, g.statusConciliacao, valor, g._count._all);
      }

      for (const g of cielo) {
        const filialId = filialMap.get(String(g.estabelecimento).trim());
        if (!filialId) {
          semMapeamento.add(g.estabelecimento);
          continue;
        }
        const dataISO = g.dataVenda;
        const row = this.getRow(map, dataISO, filialId, 'CIELO', g.bandeira);
        row.valorLiquido += Number(g._sum.valorLiquido ?? 0);
        row.taxa += Number(g._sum.taxaAdministrativa ?? 0);
        this.aplicarStatus(
          row,
          g.statusConciliacao ?? 'PENDENTE',
          Number(g._sum.valorBruto ?? 0),
          g._count._all,
        );
      }

      if (semMapeamento.size > 0) {
        await context.warn(
          currentStep,
          `Cielo: ${semMapeamento.size} estabelecimentos sem filial mapeada: ${[
            ...semMapeamento,
          ]
            .slice(0, 5)
            .join(', ')}`,
        );
        this.logger.warn(
          `Cielo: estabelecimentos sem filial mapeada: ${[...semMapeamento].join(', ')}`,
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
        semMapeamento: semMapeamento.size,
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

    await this.prisma.$transaction(async (tx) => {
      const del = await tx.fatoCartaoVendas.deleteMany({
        where: { data: { gte: startD, lte: endD } },
      });
      apagadas = del.count;

      for (let i = 0; i < rows.length; i += BATCH) {
        const created = await tx.fatoCartaoVendas.createMany({
          data: rows.slice(i, i + BATCH),
        });
        inseridas += created.count;
      }
    });

    return { apagadas, inseridas };
  }

  async findByPeriod(params: FindFatoParams) {
    const startD = new Date(`${params.startDate}T00:00:00.000Z`);
    const endD = new Date(`${params.endDate}T00:00:00.000Z`);

    return this.prisma.fatoCartaoVendas.findMany({
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

  async dashboard(params: DashboardFatoParams) {
    const startD = new Date(`${params.startDate}T00:00:00.000Z`);
    const endD = new Date(`${params.endDate}T23:59:59.999Z`);

    const where = this.buildDashboardWhere(params, startD, endD, true);

    const totais = await this.prisma.fatoCartaoVendas.groupBy({
      by: ['adquirente'],
      where,
      _sum: { valorBruto: true, valorDivergente: true },
    });

    const valor = (adquirente: OrigemConciliacao) =>
      Number(
        totais.find((t) => t.adquirente === adquirente)?._sum.valorBruto ?? 0,
      );

    const divergente = (adquirente: OrigemConciliacao) =>
      Number(
        totais.find((t) => t.adquirente === adquirente)?._sum.valorDivergente ??
          0,
      );

    const erp = valor('TRIER');
    const adquirentes = valor('REDE') + valor('CIELO');

    const conciliado = await this.prisma.fatoCartaoVendas.aggregate({
      where,
      _sum: { valorConciliado: true },
    });

    const naoConciliados = round2(
      divergente('TRIER') - divergente('REDE') - divergente('CIELO'),
    );

    const porDia = await this.prisma.fatoCartaoVendas.groupBy({
      by: ['data', 'adquirente'],
      where,
      _sum: {
        valorBruto: true,
        valorDivergente: true,
      },
    });

    const mapa: Record<string, any> = {};

    for (const row of porDia) {
      const dia = this.toISODate(new Date(row.data));
      if (!mapa[dia]) {
        mapa[dia] = { data: dia, trier: 0, adquirentes: 0, diferenca: 0 };
      }
      const valorBruto = Number(row._sum.valorBruto ?? 0);
      if (row.adquirente === 'TRIER') {
        mapa[dia].trier += valorBruto;
      } else {
        mapa[dia].adquirentes += valorBruto;
      }
      const sinal = row.adquirente === 'TRIER' ? -1 : 1;
      mapa[dia].diferenca += Number(row._sum.valorDivergente ?? 0) * sinal;
    }

    const chartLinesCards = Object.values(mapa).sort((a: any, b: any) =>
      a.data.localeCompare(b.data),
    );

    const cardsTotals = {
      erp: round2(erp),
      adquirentes: round2(adquirentes),
      diferenca: round2(adquirentes - erp),
      naoConciliados,
      kpiConciTrier: Math.min(
        100,
        erp > 0
          ? Number(
              (
                (Number(conciliado._sum.valorConciliado ?? 0) / erp) *
                100
              ).toFixed(2),
            )
          : 0,
      ),
    };

    const rankingDivergencias = await this.rankingDivergencias(
      params,
      startD,
      endD,
    );

    return { cardsTotals, chartLinesCards, rankingDivergencias };
  }

  private buildDashboardWhere(
    params: DashboardFatoParams,
    startD: Date,
    endD: Date,
    applyFilialId: boolean,
  ) {
    return {
      data: { gte: startD, lte: endD },
      ...(applyFilialId && params.filialId && { filialId: params.filialId }),
      ...(params.adquirente && { adquirente: params.adquirente }),
      ...(params.bandeiras?.length && {
        bandeira:
          params.bandeirasModo === 'excluir'
            ? { notIn: params.bandeiras }
            : { in: params.bandeiras },
      }),
    };
  }

  private async rankingDivergencias(
    params: DashboardFatoParams,
    startD: Date,
    endD: Date,
  ) {
    const rankingWhere = this.buildDashboardWhere(params, startD, endD, false);

    const rows = await this.prisma.fatoCartaoVendas.groupBy({
      by: ['filialId', 'adquirente'],
      where: rankingWhere,
      _sum: { qtdDivergente: true, valorDivergente: true },
    });

    if (!rows.length) {
      return [];
    }

    const mapa: Record<
      number,
      { trier: number; adquirentes: number; divergencias: number }
    > = {};

    for (const row of rows) {
      const atual =
        mapa[row.filialId] ??
        (mapa[row.filialId] = {
          trier: 0,
          adquirentes: 0,
          divergencias: 0,
        });

      atual.divergencias += Number(row._sum.qtdDivergente ?? 0);

      const valor = Number(row._sum.valorDivergente ?? 0);
      if (row.adquirente === 'TRIER') {
        atual.trier += valor;
      } else {
        atual.adquirentes += valor;
      }
    }

    const ids = Object.keys(mapa).map(Number);
    const filiais = await this.prisma.filial.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });

    const filialMap = new Map(filiais.map((f) => [f.id, f.name]));

    return ids
      .map((id) => {
        const m = mapa[id];
        return {
          filial: filialMap.get(id) ?? `Filial ${id}`,
          filialId: id,
          trier: round2(m.trier),
          adquirentes: round2(m.adquirentes),
          diferenca: round2(m.adquirentes - m.trier),
          divergencias: m.divergencias,
        };
      })
      .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca));
  }

  async getFiltros() {
    const result = await this.prisma.fatoCartaoVendas.groupBy({
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
