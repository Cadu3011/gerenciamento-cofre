import { Inject, Injectable } from '@nestjs/common';
import {
  ObservacaoConciliacao,
  ParcelStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { ConciliacaoParcPipeline } from './cron/conciliacao-parc.pipeline';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

export interface ParcFilters {
  status?: ParcelStatus[];
  bandeiras?: string[];
  divergencias?: ObservacaoConciliacao[];
}

export interface ParcTotaisFiltro {
  conciliados: number;
  divergentes: number;
  naoEncontrados: number;
  trierValor: number;
  outraValor: number;
  diferencaValor: number;
  trierLiquido: number;
  outraLiquido: number;
  diferencaLiquido: number;
  trierTaxa: number;
  outraTaxa: number;
}

export interface ParcPageResult {
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
  totais: ParcTotaisFiltro;
}

@Injectable()
export class ConciliacaoParcService {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject()
  private readonly pipeline: ConciliacaoParcPipeline;

  private mapTrier(t: any) {
    return {
      id: t.id,
      documentoFiscal: t.documentoFiscal,
      nsuAdministradora: t.nsuAdministradora,
      modalidadeVenda: t.modalidadeVenda,
      bandeira: t.bandeira,
      parcela: t.parcela,
      totalParcelas: t.totalParcelas,
      dataEmissao: t.dataEmissao,
      dataVencimento: t.dataVencimento,
      valor: t.valor,
      valorLiquido: t.valorLiquido,
      taxa: String(t.valorTaxas ?? 0),
      statusConciliacao: t.statusConciliacao,
    };
  }

  private mapItem(item: any) {
    if (item.redeParcela) {
      return {
        origem: 'REDE' as const,
        id: item.redeParcela.id,
        nsu: item.redeParcela.nsu,
        parcela: item.redeParcela.parcela,
        totalParcelas: item.redeParcela.totalParcelas,
        dataVenda: item.redeParcela.dataVenda,
        vencimento: item.redeParcela.vencimento,
        valor: item.redeParcela.valor,
        valorLiquido: item.redeParcela.valorLiquido,
        taxa: String(item.redeParcela.taxa ?? 0),
        statusConciliacao: item.redeParcela.statusConciliacao,
      };
    }
    if (item.cieloParcela) {
      return {
        origem: 'CIELO' as const,
        id: item.cieloParcela.id,
        nsu: item.cieloParcela.nsu,
        codigoTransacao: item.cieloParcela.codigoTransacao,
        modalidade: item.cieloParcela.modalidade,
        bandeira: item.cieloParcela.bandeira,
        parcela: item.cieloParcela.parcela,
        totalParcelas: item.cieloParcela.totalParcelas,
        dataVenda: item.cieloParcela.dataVenda,
        dataVencimento: item.cieloParcela.dataVencimento,
        valor: item.cieloParcela.valor,
        valorLiquido: item.cieloParcela.valorLiquido,
        taxa: String(
          Number(item.cieloParcela.valor) -
            Number(item.cieloParcela.valorLiquido),
        ),
        statusConciliacao: item.cieloParcela.statusConciliacao,
      };
    }
    return null;
  }

  private mapGrupo(c: any) {
    const trierItems = c.itens.filter((i: any) => i.trierParcela);
    const rcItems = c.itens.filter((i: any) => i.redeParcela || i.cieloParcela);
    const observacoes = c.observacoes?.map((o: any) => o.tipo) ?? [];

    return {
      id: c.id,
      status: c.status,
      tipoMatch: c.tipoMatch,
      score: c.score,
      observacao: c.observacao,
      observacoes,
      createdAt: c.createdAt,
      triers: trierItems.map((i: any) => this.mapTrier(i.trierParcela)),
      itens: rcItems.map((item: any) => this.mapItem(item)).filter(Boolean),
    };
  }

  private buildOrFilter(
    filialId: number,
    start: Date,
    end: Date,
    bandeiras?: string[],
  ) {
    const trierBandeira =
      bandeiras?.length ? { bandeira: { in: bandeiras } } : {};
    const cieloBandeira =
      bandeiras?.length ? { bandeira: { in: bandeiras } } : {};

    return {
      itens: {
        some: {
          OR: [
            {
              trierParcela: {
                filialId,
                dataEmissao: { gte: start, lte: end },
                ...trierBandeira,
              },
            },
            {
              redeParcela: {
                filialId,
                dataVenda: { gte: start, lte: end },
              },
            },
            {
              cieloParcela: {
                filialId,
                dataVenda: { gte: start, lte: end },
                ...cieloBandeira,
              },
            },
          ],
        },
      },
    };
  }

  private buildStatusFilter(statuses?: ParcelStatus[]) {
    return statuses?.length ? { status: { in: statuses } } : {};
  }

  private buildDivergenciasFilter(divergencias?: ObservacaoConciliacao[]) {
    return divergencias?.length
      ? { observacoes: { some: { tipo: { in: divergencias } } } }
      : {};
  }

  private includeAll() {
    return {
      itens: {
        include: {
          trierParcela: true,
          redeParcela: true,
          cieloParcela: true,
        },
      },
      observacoes: true,
    };
  }

  async findByDate(
    filialId: number,
    date: string,
    filters?: ParcFilters,
    page = 1,
    pageSize = 100,
  ): Promise<ParcPageResult> {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const where = {
      ...this.buildStatusFilter(filters?.status),
      ...this.buildDivergenciasFilter(filters?.divergencias),
      ...this.buildOrFilter(filialId, start, end, filters?.bandeiras),
    };

    const [total, items] = await Promise.all([
      this.prisma.conciliacaoParcela.count({ where }),
      this.prisma.conciliacaoParcela.findMany({
        where,
        include: this.includeAll(),
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: items.map((c) => this.mapGrupo(c)),
      total,
      page,
      pageSize,
      totais: await this.findTotais(filialId, start, end, filters),
    };
  }

  private async findTotais(
    filialId: number,
    start: Date,
    end: Date,
    filters?: ParcFilters,
  ): Promise<ParcTotaisFiltro> {
    const registros = await this.prisma.conciliacaoParcela.findMany({
      where: {
        ...this.buildStatusFilter(filters?.status),
        ...this.buildDivergenciasFilter(filters?.divergencias),
        ...this.buildOrFilter(filialId, start, end, filters?.bandeiras),
      },
      select: {
        status: true,
        itens: {
          select: {
            trierParcela: {
              select: {
                valor: true,
                valorLiquido: true,
                valorTaxas: true,
                filialId: true,
              },
            },
            redeParcela: {
              select: {
                valor: true,
                valorLiquido: true,
                taxa: true,
                filialId: true,
              },
            },
            cieloParcela: {
              select: {
                valor: true,
                valorLiquido: true,
                filialId: true,
              },
            },
          },
        },
      },
    });

    const totais: ParcTotaisFiltro = {
      conciliados: 0,
      divergentes: 0,
      naoEncontrados: 0,
      trierValor: 0,
      outraValor: 0,
      diferencaValor: 0,
      trierLiquido: 0,
      outraLiquido: 0,
      diferencaLiquido: 0,
      trierTaxa: 0,
      outraTaxa: 0,
    };

    for (const c of registros) {
      if (c.status === 'CONCILIADO') totais.conciliados++;
      else if (c.status === 'DIVERGENTE') totais.divergentes++;
      else if (c.status === 'NAO_ENCONTRADO') totais.naoEncontrados++;

      for (const it of c.itens) {
        if (it.trierParcela?.filialId === filialId) {
          totais.trierValor += Number(it.trierParcela.valor);
          totais.trierLiquido += Number(it.trierParcela.valorLiquido);
          totais.trierTaxa += Number(it.trierParcela.valorTaxas ?? 0);
        }
        if (it.redeParcela?.filialId === filialId) {
          totais.outraValor += Number(it.redeParcela.valor);
          totais.outraLiquido += Number(it.redeParcela.valorLiquido);
          totais.outraTaxa += Number(it.redeParcela.taxa ?? 0);
        }
        if (it.cieloParcela?.filialId === filialId) {
          totais.outraValor += Number(it.cieloParcela.valor);
          totais.outraLiquido += Number(it.cieloParcela.valorLiquido);
          totais.outraTaxa +=
            Number(it.cieloParcela.valor) - Number(it.cieloParcela.valorLiquido);
        }
      }
    }

    totais.diferencaValor = totais.trierValor - totais.outraValor;
    totais.diferencaLiquido = totais.trierLiquido - totais.outraLiquido;

    return totais;
  }

  async findByDateDivergentes(
    filialId: number,
    dateRange: { from: string; to: string },
    filters?: Pick<ParcFilters, 'bandeiras' | 'divergencias'>,
    page = 1,
    pageSize = 100,
  ) {
    const start = new Date(`${dateRange.from}T00:00:00.000Z`);
    const end = new Date(`${dateRange.to}T23:59:59.999Z`);

    const where = {
      status: ParcelStatus.DIVERGENTE,
      ...this.buildDivergenciasFilter(filters?.divergencias),
      ...this.buildOrFilter(filialId, start, end, filters?.bandeiras),
    };

    const [total, conciliacoes] = await Promise.all([
      this.prisma.conciliacaoParcela.count({ where }),
      this.prisma.conciliacaoParcela.findMany({
        where,
        include: this.includeAll(),
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: conciliacoes.map((c) => this.mapGrupo(c)),
      total,
      page,
      pageSize,
    };
  }

  async findByDateConciliados(filialId: number, conciliacaoId: number) {
    const c = await this.prisma.conciliacaoParcela.findUnique({
      where: { id: conciliacaoId },
      include: this.includeAll(),
    });

    if (!c) return null;

    const hasFilial = c.itens.some(
      (i: any) =>
        i.trierParcela?.filialId === filialId ||
        i.redeParcela?.filialId === filialId ||
        i.cieloParcela?.filialId === filialId,
    );
    if (!hasFilial) return null;

    return this.mapGrupo(c);
  }

  async totalsDia(filialId: number, dateRange: { from: string; to: string }) {
    const start = `${dateRange.from}T00:00:00.000Z`;
    const end = `${dateRange.to}T23:59:59.999Z`;

    const rows = await this.prisma.$queryRaw<
      {
        dia: string;
        conciliados: bigint;
        divergentes: bigint;
        naoEncontrados: bigint;
        totalValor: any;
        totalValorLiquido: any;
        totalTaxas: any;
      }[]
    >(Prisma.sql`
      WITH base AS (
        SELECT
          COALESCE(
            MAX(CASE WHEN tp.filialId = ${filialId} THEN tp.dataEmissao END),
            MAX(CASE WHEN cip.filialId = ${filialId} THEN cip.dataVenda END),
            MAX(CASE WHEN rp.filialId = ${filialId} THEN rp.dataVenda END)
          ) AS dia,
          MAX(CASE WHEN cp.status = 'CONCILIADO' THEN 1 ELSE 0 END) AS conciliado,
          MAX(CASE WHEN cp.status = 'DIVERGENTE' THEN 1 ELSE 0 END) AS divergente,
          MAX(CASE WHEN cp.status = 'NAO_ENCONTRADO' THEN 1 ELSE 0 END) AS naoEncontrado,
          SUM(CASE WHEN tp.filialId = ${filialId} THEN tp.valor ELSE 0 END) AS totalValor,
          SUM(CASE WHEN tp.filialId = ${filialId} THEN tp.valorLiquido ELSE 0 END) AS totalValorLiquido,
          (SUM(CASE WHEN tp.filialId = ${filialId} THEN COALESCE(tp.valorTaxas, 0) ELSE 0 END)
           + SUM(CASE WHEN rp.filialId = ${filialId} THEN COALESCE(rp.taxa, 0) ELSE 0 END)
           + SUM(CASE WHEN cip.filialId = ${filialId} THEN COALESCE(cip.valor, 0) - COALESCE(cip.valorLiquido, 0) ELSE 0 END)) AS totalTaxas
        FROM ConciliacaoParcela cp
        JOIN ConciliacaoParcelaItem cpi ON cpi.conciliacaoParcelaId = cp.id
        LEFT JOIN TrierParcela tp ON tp.id = cpi.trierParcelaId
        LEFT JOIN RedeParcela rp ON rp.id = cpi.redeParcelaId
        LEFT JOIN CieloParcela cip ON cip.id = cpi.cieloParcelaId
        WHERE (
          (tp.id IS NOT NULL AND tp.filialId = ${filialId} AND tp.dataEmissao >= ${start} AND tp.dataEmissao <= ${end})
          OR (rp.id IS NOT NULL AND rp.filialId = ${filialId} AND rp.dataVenda >= ${start} AND rp.dataVenda <= ${end})
          OR (cip.id IS NOT NULL AND cip.filialId = ${filialId} AND cip.dataVenda >= ${start} AND cip.dataVenda <= ${end})
        )
        GROUP BY cp.id
      )
      SELECT
        DATE_FORMAT(base.dia, '%Y-%m-%d') AS dia,
        SUM(base.conciliado) AS conciliados,
        SUM(base.divergente) AS divergentes,
        SUM(base.naoEncontrado) AS naoEncontrados,
        COALESCE(SUM(base.totalValor), 0) AS totalValor,
        COALESCE(SUM(base.totalValorLiquido), 0) AS totalValorLiquido,
        COALESCE(SUM(base.totalTaxas), 0) AS totalTaxas
      FROM base
      WHERE base.dia IS NOT NULL
      GROUP BY base.dia
      ORDER BY base.dia DESC
    `);

    return rows.map((r) => ({
      data: String(r.dia),
      conciliados: Number(r.conciliados),
      divergentes: Number(r.divergentes),
      naoEncontrados: Number(r.naoEncontrados),
      totalValor: Number(r.totalValor),
      totalValorLiquido: Number(r.totalValorLiquido),
      totalTaxas: Number(r.totalTaxas),
    }));
  }

  async totalDiferencaDia(filialId: number, date: string) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const result = await this.prisma.conciliacaoParcela.aggregate({
      where: {
        status: { not: 'CONCILIADO' },
        ...this.buildOrFilter(filialId, start, end),
      },
      _count: true,
    });

    return result._count;
  }

  async execute(filialId: number, date: string) {
    const dateObj = new Date(`${date}T00:00:00.000Z`);

    const lote = await this.prisma.conciliacaoLote.create({
      data: {
        periodoInicial: dateObj,
        periodoFinal: dateObj,
        algoritmoVersao: '1.0',
      },
    });

    const context = new JobExecutionContext();
    return this.pipeline.execute(date, filialId, context, lote.id);
  }
}
