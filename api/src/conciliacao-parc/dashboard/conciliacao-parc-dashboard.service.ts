import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class ConciliacaoParcDashboardService {
  @Inject()
  private readonly prisma: PrismaService;

  private dateParams(dateRange: { from: string; to: string }) {
    return {
      start: dateRange.from + 'T00:00:00.000Z',
      end: dateRange.to + 'T23:59:59.999Z',
    };
  }

  private trierWhere(bandeiras?: string[], filialId?: number, alias = '') {
    const prefix = alias ? `${alias}.` : '';
    const params: any[] = [];
    let sql = '';
    if (bandeiras?.length) {
      const ph = bandeiras.map(() => '?').join(',');
      sql += ` AND ${prefix}bandeira NOT IN (${ph})`;
      params.push(...bandeiras);
    }
    if (filialId) {
      sql += ` AND ${prefix}filialId = ?`;
      params.push(filialId);
    }
    return { sql, params };
  }

  private redeWhere(filialId?: number, alias = '') {
    const prefix = alias ? `${alias}.` : '';
    if (!filialId) return { sql: '', params: [] as any[] };
    return { sql: ` AND ${prefix}filialId = ?`, params: [filialId] };
  }

  private cieloWhere(filialId?: number, alias = '') {
    const prefix = alias ? `${alias}.` : '';
    if (!filialId) return { sql: '', params: [] as any[] };
    return { sql: ` AND ${prefix}filialId = ?`, params: [filialId] };
  }

  async totaisCards(
    dateRange: { from: string; to: string },
    filialId?: number,
    bandeiras?: string[],
  ) {
    const { start, end } = this.dateParams(dateRange);
    const t = this.trierWhere(bandeiras, filialId);
    const r = this.redeWhere(filialId);
    const c = this.cieloWhere(filialId);

    const sql = `
      SELECT
        COALESCE(SUM(CASE WHEN src = 'trier' THEN valor END), 0) AS trier,
        COALESCE(SUM(CASE WHEN src = 'adq' THEN valor END), 0) AS adquirentes
      FROM (
        SELECT 'trier' AS src, valor FROM TrierParcela
        WHERE dataEmissao BETWEEN ? AND ?${t.sql}
        UNION ALL
        SELECT 'adq', valor FROM RedeParcela
        WHERE dataVenda BETWEEN ? AND ?${r.sql}
        UNION ALL
        SELECT 'adq', valor FROM CieloParcela
        WHERE dataVenda BETWEEN ? AND ?${c.sql}
      ) t
    `;
    const params = [
      start,
      end,
      ...t.params,
      start,
      end,
      ...r.params,
      start,
      end,
      ...c.params,
    ];

    const [totals, statusCounts, divCount] = await Promise.all([
      this.prisma.$queryRawUnsafe<{ trier: any; adquirentes: any }[]>(
        sql,
        ...params,
      ),
      this.prisma.trierParcela.groupBy({
        by: ['statusConciliacao'],
        where: {
          ...(filialId ? { filialId } : {}),
          ...(bandeiras?.length
            ? { NOT: { bandeira: { in: bandeiras } } }
            : {}),
          dataEmissao: { gte: new Date(start), lte: new Date(end) },
        },
        _sum: { valor: true },
      }),
      this.prisma.conciliacaoParcela.count({
        where: {
          status: 'DIVERGENTE',
          itens: {
            some: {
              OR: [
                ...(bandeiras?.length
                  ? [
                      {
                        trierParcela: {
                          bandeira: { notIn: bandeiras },
                          ...(filialId ? { filialId } : {}),
                          dataEmissao: {
                            gte: new Date(start),
                            lte: new Date(end),
                          },
                        },
                      },
                    ]
                  : [
                      {
                        trierParcela: {
                          ...(filialId ? { filialId } : {}),
                          dataEmissao: {
                            gte: new Date(start),
                            lte: new Date(end),
                          },
                        },
                      },
                    ]),
                {
                  redeParcela: {
                    ...(filialId ? { filialId } : {}),
                    dataVenda: { gte: new Date(start), lte: new Date(end) },
                  },
                },
                {
                  cieloParcela: {
                    ...(filialId ? { filialId } : {}),
                    dataVenda: { gte: new Date(start), lte: new Date(end) },
                  },
                },
              ],
            },
          },
        },
      }),
    ]);

    const row = totals[0];
    const totalErp = Number(row?.trier || 0);
    const totalAdq = Number(row?.adquirentes || 0);
    const diferenca =
      Math.abs(totalErp - totalAdq) < 0.01 ? 0 : totalErp - totalAdq;

    const naoConciliados = statusCounts.find(
      (s) => s.statusConciliacao === 'DIVERGENTE',
    );
    const conciliados = statusCounts.find(
      (s) => s.statusConciliacao === 'CONCILIADO',
    );
    const naoConciliadoValor = Number(naoConciliados?._sum.valor || 0);
    const conciliadoValor = Number(conciliados?._sum.valor || 0);
    const kpiConciTrier =
      totalErp > 0
        ? Number(((conciliadoValor / totalErp) * 100).toFixed(2))
        : 0;

    return {
      erp: Number(totalErp.toFixed(2)),
      adquirentes: Number(totalAdq.toFixed(2)),
      diferenca: Number(diferenca.toFixed(2)),
      naoConciliados: Number(naoConciliadoValor.toFixed(2)),
      kpiConciTrier,
      divergencias: divCount,
    };
  }

  async chartLines(
    dateRange: { from: string; to: string },
    filialId?: number,
    bandeiras?: string[],
  ) {
    const { start, end } = this.dateParams(dateRange);
    const t = this.trierWhere(bandeiras, filialId);
    const r = this.redeWhere(filialId);
    const c = this.cieloWhere(filialId);

    const params = [
      start,
      end,
      ...t.params,
      start,
      end,
      ...r.params,
      start,
      end,
      ...c.params,
    ];

    const rows = await this.prisma.$queryRawUnsafe<
      { dia: string; trier: any; adquirentes: any }[]
    >(
      `
      SELECT dia, SUM(trier) AS trier, SUM(adq) AS adquirentes
      FROM (
        SELECT DATE(dataEmissao) AS dia, valor AS trier, 0 AS adq
        FROM TrierParcela WHERE dataEmissao BETWEEN ? AND ?${t.sql}
        UNION ALL
        SELECT DATE(dataVenda), 0, valor
        FROM RedeParcela WHERE dataVenda BETWEEN ? AND ?${r.sql}
        UNION ALL
        SELECT DATE(dataVenda), 0, valor
        FROM CieloParcela WHERE dataVenda BETWEEN ? AND ?${c.sql}
      ) t
      GROUP BY dia
      ORDER BY dia
    `,
      ...params,
    );

    return rows.map((r) => ({
      data: r.dia,
      trier: Number(r.trier || 0),
      adquirentes: Number(r.adquirentes || 0),
      diferenca: Number(r.trier || 0) - Number(r.adquirentes || 0),
    }));
  }

  async chartDiferencaMensal(
    dateRange: { from: string; to: string },
    filialId?: number,
    bandeiras?: string[],
  ) {
    const { start, end } = this.dateParams(dateRange);
    const t = this.trierWhere(bandeiras, filialId);
    const r = this.redeWhere(filialId);
    const c = this.cieloWhere(filialId);

    const params = [
      start,
      end,
      ...t.params,
      start,
      end,
      ...r.params,
      start,
      end,
      ...c.params,
    ];

    const rows = await this.prisma.$queryRawUnsafe<
      { mes: string; trier: any; adquirentes: any }[]
    >(
      `
      SELECT mes, SUM(trier) AS trier, SUM(adq) AS adquirentes
      FROM (
        SELECT DATE_FORMAT(dataEmissao, '%Y-%m') AS mes, valor AS trier, 0 AS adq
        FROM TrierParcela WHERE dataEmissao BETWEEN ? AND ?${t.sql}
        UNION ALL
        SELECT DATE_FORMAT(dataVenda, '%Y-%m'), 0, valor
        FROM RedeParcela WHERE dataVenda BETWEEN ? AND ?${r.sql}
        UNION ALL
        SELECT DATE_FORMAT(dataVenda, '%Y-%m'), 0, valor
        FROM CieloParcela WHERE dataVenda BETWEEN ? AND ?${c.sql}
      ) t
      GROUP BY mes
      ORDER BY mes
    `,
      ...params,
    );

    return rows.map((r) => ({
      mes: r.mes,
      trier: Number(r.trier || 0),
      adquirentes: Number(r.adquirentes || 0),
      diferenca: Number(r.adquirentes || 0) - Number(r.trier || 0),
    }));
  }

  async chartRankingPendencias(
    dateRange: { from: string; to: string },
    bandeiras?: string[],
  ) {
    const { start, end } = this.dateParams(dateRange);

    const bandP: any[] = [];
    let bandSql = '';
    if (bandeiras?.length) {
      const ph = bandeiras.map(() => '?').join(',');
      bandSql = ` AND bandeira NOT IN (${ph})`;
      bandP.push(...bandeiras);
    }

    const rows = await this.prisma.$queryRawUnsafe<
      {
        filialId: number;
        filial: string;
        trier: any;
        adquirentes: any;
        diferenca: any;
        divergencias: bigint;
      }[]
    >(
      `
      WITH
      trier_total AS (
        SELECT COALESCE(filialId, 0) AS filialId, SUM(valor) AS total
        FROM TrierParcela
        WHERE dataEmissao BETWEEN ? AND ?${bandSql}
        GROUP BY filialId
      ),
      adq_total AS (
        SELECT COALESCE(filialId, 0) AS filialId, SUM(valor) AS total
        FROM (
          SELECT filialId, valor FROM RedeParcela WHERE dataVenda BETWEEN ? AND ?
          UNION ALL
          SELECT filialId, valor FROM CieloParcela WHERE dataVenda BETWEEN ? AND ?
        ) adq
        GROUP BY filialId
      ),
      div_count AS (
        SELECT COALESCE(tp.filialId, rp.filialId, cip.filialId, 0) AS filialId,
               COUNT(DISTINCT cp.id) AS divergencias
        FROM ConciliacaoParcela cp
        JOIN ConciliacaoParcelaItem cpi ON cpi.conciliacaoParcelaId = cp.id
        LEFT JOIN TrierParcela tp ON tp.id = cpi.trierParcelaId
        LEFT JOIN RedeParcela rp ON rp.id = cpi.redeParcelaId
        LEFT JOIN CieloParcela cip ON cip.id = cpi.cieloParcelaId
        WHERE cp.status = 'DIVERGENTE'
          AND (
            (tp.id IS NOT NULL AND tp.dataEmissao BETWEEN ? AND ?)
            OR (rp.id IS NOT NULL AND rp.dataVenda BETWEEN ? AND ?)
            OR (cip.id IS NOT NULL AND cip.dataVenda BETWEEN ? AND ?)
          )
        GROUP BY filialId
      )
      SELECT f.id AS filialId, f.name AS filial,
        COALESCE(tt.total, 0) AS trier,
        COALESCE(at.total, 0) AS adquirentes,
        COALESCE(tt.total, 0) - COALESCE(at.total, 0) AS diferenca,
        COALESCE(dc.divergencias, 0) AS divergencias
      FROM Filial f
      LEFT JOIN trier_total tt ON tt.filialId = f.id
      LEFT JOIN adq_total at ON at.filialId = f.id
      LEFT JOIN div_count dc ON dc.filialId = f.id
      WHERE tt.total IS NOT NULL OR at.total IS NOT NULL
      ORDER BY ABS(COALESCE(tt.total, 0) - COALESCE(at.total, 0)) DESC
    `,
      start,
      end,
      ...bandP,
      start,
      end,
      start,
      end,
      start,
      end,
      start,
      end,
      start,
      end,
    );

    return rows.map((r) => ({
      filial: r.filial,
      filialId: Number(r.filialId),
      trier: Number(r.trier),
      adquirentes: Number(r.adquirentes),
      diferenca: Number(r.diferenca) * -1,
      divergencias: Number(r.divergencias),
    }));
  }

  async chartRankingDivergencias(
    dateRange: { from: string; to: string },
    filialId?: number,
    bandeiras?: string[],
  ) {
    const { start, end } = this.dateParams(dateRange);
    const t = this.trierWhere(bandeiras, filialId, 'tp');
    const r = this.redeWhere(filialId, 'rp');
    const c = this.cieloWhere(filialId, 'cip');

    const params = [
      start,
      end,
      ...t.params,
      start,
      end,
      ...r.params,
      start,
      end,
      ...c.params,
    ];

    const grupos = await this.prisma.$queryRawUnsafe<
      { id: number; status: string }[]
    >(
      `
      SELECT cp.id, cp.status
      FROM ConciliacaoParcela cp
      JOIN ConciliacaoParcelaItem cpi ON cpi.conciliacaoParcelaId = cp.id
      LEFT JOIN TrierParcela tp ON tp.id = cpi.trierParcelaId
      LEFT JOIN RedeParcela rp ON rp.id = cpi.redeParcelaId
      LEFT JOIN CieloParcela cip ON cip.id = cpi.cieloParcelaId
      WHERE (
        (tp.id IS NOT NULL AND tp.dataEmissao BETWEEN ? AND ?${t.sql})
        OR (rp.id IS NOT NULL AND rp.dataVenda BETWEEN ? AND ?${r.sql})
        OR (cip.id IS NOT NULL AND cip.dataVenda BETWEEN ? AND ?${c.sql})
      )
    `,
      ...params,
    );

    const totalGrupos = grupos.length;
    const conciliados = grupos.filter((g) => g.status === 'CONCILIADO').length;
    const divergentes = grupos.filter((g) => g.status === 'DIVERGENTE').length;
    const naoEncontrados = grupos.filter(
      (g) => g.status === 'NAO_ENCONTRADO',
    ).length;

    if (!totalGrupos) {
      return {
        resumo: {
          totalGrupos: 0,
          conciliados: 0,
          divergentes: 0,
          naoEncontrados: 0,
          percentualConciliado: 0,
          percentualDivergente: 0,
        },
        ranking: [],
      };
    }

    const params2 = [
      start,
      end,
      ...t.params,
      start,
      end,
      ...r.params,
      start,
      end,
      ...c.params,
    ];

    const observacoes = await this.prisma.$queryRawUnsafe<
      { tipo: string; quantidade: bigint }[]
    >(
      `
      SELECT cpo.tipo, COUNT(*) AS quantidade
      FROM ConciliacaoParcelaObservacao cpo
      WHERE cpo.conciliacaoParcelaId IN (
        SELECT cp.id
        FROM ConciliacaoParcela cp
        JOIN ConciliacaoParcelaItem cpi ON cpi.conciliacaoParcelaId = cp.id
        LEFT JOIN TrierParcela tp ON tp.id = cpi.trierParcelaId
        LEFT JOIN RedeParcela rp ON rp.id = cpi.redeParcelaId
        LEFT JOIN CieloParcela cip ON cip.id = cpi.cieloParcelaId
        WHERE (
          (tp.id IS NOT NULL AND tp.dataEmissao BETWEEN ? AND ?${t.sql})
          OR (rp.id IS NOT NULL AND rp.dataVenda BETWEEN ? AND ?${r.sql})
          OR (cip.id IS NOT NULL AND cip.dataVenda BETWEEN ? AND ?${c.sql})
        )
      )
      GROUP BY cpo.tipo
      ORDER BY quantidade DESC
    `,
      ...params2,
    );

    const totalObservacoes = observacoes.reduce(
      (acc, o) => acc + Number(o.quantidade),
      0,
    );

    const ranking = observacoes.map((o) => ({
      tipo: o.tipo,
      quantidade: Number(o.quantidade),
      percentual:
        totalObservacoes > 0
          ? Number(((Number(o.quantidade) / totalObservacoes) * 100).toFixed(2))
          : 0,
    }));

    return {
      resumo: {
        totalGrupos,
        conciliados,
        divergentes,
        naoEncontrados,
        percentualConciliado:
          totalGrupos > 0
            ? Number(((conciliados / totalGrupos) * 100).toFixed(2))
            : 0,
        percentualDivergente:
          totalGrupos > 0
            ? Number(((divergentes / totalGrupos) * 100).toFixed(2))
            : 0,
      },
      ranking,
    };
  }

  async aReceber(
    dateRange: { from: string; to: string },
    filialId?: number,
    bandeiras?: string[],
  ) {
    const { start, end } = this.dateParams(dateRange);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = hoje.toISOString().slice(0, 10);
    const hojeEnd = hojeStr + 'T23:59:59.999Z';

    const daqui7 = new Date(hoje);
    daqui7.setDate(daqui7.getDate() + 7);
    const daqui15 = new Date(hoje);
    daqui15.setDate(daqui15.getDate() + 15);
    const daqui30 = new Date(hoje);
    daqui30.setDate(daqui30.getDate() + 30);
    const daqui60 = new Date(hoje);
    daqui60.setDate(daqui60.getDate() + 60);

    const faixaSQL = (tabela: string, colVenc: string) => {
      const params: any[] = [start, end];
      let extra = '';
      if (tabela === 'TrierParcela' && bandeiras?.length) {
        const ph = bandeiras.map(() => '?').join(',');
        extra = ` AND bandeira NOT IN (${ph})`;
        params.push(...bandeiras);
      }
      if (filialId) {
        extra += ` AND filialId = ?`;
        params.push(filialId);
      }
      // CASE dates are inlined (safe — computed internally, not user input)
      return {
        sql: `
          SELECT
            COALESCE(SUM(CASE WHEN ${colVenc} <= '${hojeEnd}' THEN valor END), 0) AS vencido,
            COALESCE(SUM(CASE WHEN ${colVenc} >= '${hojeStr}T00:00:00.000Z' AND ${colVenc} <= '${hojeEnd}' THEN valor END), 0) AS hoje,
            COALESCE(SUM(CASE WHEN ${colVenc} > '${hojeEnd}' AND ${colVenc} <= '${daqui7.toISOString()}' THEN valor END), 0) AS d1_7,
            COALESCE(SUM(CASE WHEN ${colVenc} > '${daqui7.toISOString()}' AND ${colVenc} <= '${daqui15.toISOString()}' THEN valor END), 0) AS d8_15,
            COALESCE(SUM(CASE WHEN ${colVenc} > '${daqui15.toISOString()}' AND ${colVenc} <= '${daqui30.toISOString()}' THEN valor END), 0) AS d16_30,
            COALESCE(SUM(CASE WHEN ${colVenc} > '${daqui30.toISOString()}' AND ${colVenc} <= '${daqui60.toISOString()}' THEN valor END), 0) AS d31_60,
            COALESCE(SUM(CASE WHEN ${colVenc} > '${daqui60.toISOString()}' THEN valor END), 0) AS d60_plus
          FROM ${tabela}
          WHERE dataEmissao BETWEEN ? AND ?${extra}
        `,
        params,
      };
    };

    const trierQ = faixaSQL('TrierParcela', 'dataVencimento');
    const redeQ = faixaSQL('RedeParcela', 'vencimento');
    const cieloQ = faixaSQL('CieloParcela', 'dataVencimento');
    const [trierRow, redeRow, cieloRow] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(trierQ.sql, ...trierQ.params),
      this.prisma.$queryRawUnsafe<any[]>(redeQ.sql, ...redeQ.params),
      this.prisma.$queryRawUnsafe<any[]>(cieloQ.sql, ...cieloQ.params),
    ]);

    const labels = [
      'Vencido',
      'Hoje',
      '1-7 dias',
      '8-15 dias',
      '16-30 dias',
      '31-60 dias',
      '60+ dias',
    ];
    const keys = [
      'vencido',
      'hoje',
      'd1_7',
      'd8_15',
      'd16_30',
      'd31_60',
      'd60_plus',
    ];
    const faixas = labels.map((label, i) => {
      const k = keys[i];
      const trier = Number(trierRow[0]?.[k] || 0);
      const adquirentes =
        Number(redeRow[0]?.[k] || 0) + Number(cieloRow[0]?.[k] || 0);
      const diferenca =
        Math.abs(adquirentes - trier) < 0.01 ? 0 : adquirentes - trier;
      return {
        label,
        trier,
        adquirentes,
        diferenca: Number(diferenca.toFixed(2)),
      };
    });

    const t2 = this.trierWhere(bandeiras, filialId);
    const r2 = this.redeWhere(filialId);
    const c2 = this.cieloWhere(filialId);

    const chartParams = [
      start,
      end,
      ...t2.params,
      start,
      end,
      ...r2.params,
      start,
      end,
      ...c2.params,
    ];

    const chartLinhas = await this.prisma.$queryRawUnsafe<
      { dia: string; trier: any; adquirentes: any }[]
    >(
      `
      SELECT dia, SUM(trier) AS trier, SUM(adq) AS adquirentes
      FROM (
        SELECT DATE(dataVencimento) AS dia, valor AS trier, 0 AS adq
        FROM TrierParcela WHERE dataEmissao BETWEEN ? AND ?${t2.sql}
        UNION ALL
        SELECT DATE(vencimento), 0, valor
        FROM RedeParcela WHERE dataVenda BETWEEN ? AND ?${r2.sql}
        UNION ALL
        SELECT DATE(dataVencimento), 0, valor
        FROM CieloParcela WHERE dataVenda BETWEEN ? AND ?${c2.sql}
      ) t
      GROUP BY dia
      ORDER BY dia
    `,
      ...chartParams,
    );

    return {
      faixas,
      chartLinhas: chartLinhas.map((r) => ({
        data: r.dia,
        trier: Number(r.trier || 0),
        adquirentes: Number(r.adquirentes || 0),
      })),
    };
  }

  async getBandeiras() {
    const result = await this.prisma.trierParcela.groupBy({
      by: ['bandeira'],
      _count: true,
      orderBy: { bandeira: 'asc' },
    });
    return result
      .map((r) => r.bandeira)
      .filter((b): b is string => b !== null && b !== '');
  }
}
