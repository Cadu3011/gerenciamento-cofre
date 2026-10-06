import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  /** Fragmento ` AND <alias>.bandeira NOT IN (...)` + ` AND <alias>.filialId = ?` */
  private trierWhere(bandeiras?: string[], filialId?: number, alias = '') {
    const prefix = alias ? `${alias}.` : '';
    const parts: Prisma.Sql[] = [];
    if (bandeiras?.length) {
      parts.push(
        Prisma.sql`${Prisma.raw(prefix)}bandeira NOT IN (${Prisma.join(
          bandeiras,
        )})`,
      );
    }
    if (filialId) {
      parts.push(Prisma.sql`${Prisma.raw(prefix)}filialId = ${filialId}`);
    }
    return parts.length
      ? Prisma.sql` AND ${Prisma.join(parts, ' AND ')}`
      : Prisma.empty;
  }

  /** Fragmento ` AND bandeira NOT IN (...)` (sem filial) */
  private bandeiraWhere(bandeiras?: string[], alias = '') {
    if (!bandeiras?.length) return Prisma.empty;
    const prefix = alias ? `${alias}.` : '';
    return Prisma.sql` AND ${Prisma.raw(
      prefix,
    )}bandeira NOT IN (${Prisma.join(bandeiras)})`;
  }

  /** Fragmento ` AND <alias>.filialId = ?` */
  private filialWhere(filialId?: number, alias = '') {
    if (!filialId) return Prisma.empty;
    const prefix = alias ? `${alias}.` : '';
    return Prisma.sql` AND ${Prisma.raw(prefix)}filialId = ${filialId}`;
  }

  async totaisCards(
    dateRange: { from: string; to: string },
    filialId?: number,
    bandeiras?: string[],
  ) {
    const { start, end } = this.dateParams(dateRange);
    const t = this.trierWhere(bandeiras, filialId);

    const totals = await this.prisma.$queryRaw<
      { trier: any; adquirentes: any }[]
    >(Prisma.sql`
      SELECT
        COALESCE(SUM(CASE WHEN src = 'trier' THEN valor END), 0) AS trier,
        COALESCE(SUM(CASE WHEN src = 'adq' THEN valor END), 0) AS adquirentes
      FROM (
        SELECT 'trier' AS src, valor FROM TrierParcela
        WHERE dataEmissao >= ${start} AND dataEmissao <= ${end}${t}
        UNION ALL
        SELECT 'adq', valor FROM RedeParcela
        WHERE dataVenda >= ${start} AND dataVenda <= ${end}${this.filialWhere(
          filialId,
        )}
        UNION ALL
        SELECT 'adq', valor FROM CieloParcela
        WHERE dataVenda >= ${start} AND dataVenda <= ${end}${this.filialWhere(
          filialId,
        )}
      ) t
    `);

    const [statusCounts, divCount] = await Promise.all([
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
                {
                  trierParcela: {
                    ...(filialId ? { filialId } : {}),
                    ...(bandeiras?.length
                      ? { bandeira: { notIn: bandeiras } }
                      : {}),
                    dataEmissao: {
                      gte: new Date(start),
                      lte: new Date(end),
                    },
                  },
                },
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
    const materialidade =
      totalErp > 0
        ? Number(((naoConciliadoValor / totalErp) * 100).toFixed(2))
        : 0;

    return {
      erp: Number(totalErp.toFixed(2)),
      adquirentes: Number(totalAdq.toFixed(2)),
      diferenca: Number(diferenca.toFixed(2)),
      naoConciliados: Number(naoConciliadoValor.toFixed(2)),
      kpiConciTrier,
      materialidade,
      divergencias: divCount,
    };
  }

  async chartLines(
    dateRange: { from: string; to: string },
    filialId?: number,
    bandeiras?: string[],
  ) {
    const { start, end } = this.dateParams(dateRange);

    const rows = await this.prisma.$queryRaw<
      { dia: string; trier: any; adquirentes: any }[]
    >(Prisma.sql`
      SELECT dia, SUM(trier) AS trier, SUM(adq) AS adquirentes
      FROM (
        SELECT DATE(dataEmissao) AS dia, valor AS trier, 0 AS adq
        FROM TrierParcela
        WHERE dataEmissao >= ${start} AND dataEmissao <= ${end}${this.trierWhere(
          bandeiras,
          filialId,
        )}
        UNION ALL
        SELECT DATE(dataVenda), 0, valor
        FROM RedeParcela
        WHERE dataVenda >= ${start} AND dataVenda <= ${end}${this.filialWhere(
          filialId,
        )}
        UNION ALL
        SELECT DATE(dataVenda), 0, valor
        FROM CieloParcela
        WHERE dataVenda >= ${start} AND dataVenda <= ${end}${this.filialWhere(
          filialId,
        )}
      ) t
      GROUP BY dia
      ORDER BY dia
    `);

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

    const rows = await this.prisma.$queryRaw<
      { mes: string; trier: any; adquirentes: any }[]
    >(Prisma.sql`
      SELECT mes, SUM(trier) AS trier, SUM(adq) AS adquirentes
      FROM (
        SELECT DATE_FORMAT(dataEmissao, '%Y-%m') AS mes, valor AS trier, 0 AS adq
        FROM TrierParcela
        WHERE dataEmissao >= ${start} AND dataEmissao <= ${end}${this.trierWhere(
          bandeiras,
          filialId,
        )}
        UNION ALL
        SELECT DATE_FORMAT(dataVenda, '%Y-%m'), 0, valor
        FROM RedeParcela
        WHERE dataVenda >= ${start} AND dataVenda <= ${end}${this.filialWhere(
          filialId,
        )}
        UNION ALL
        SELECT DATE_FORMAT(dataVenda, '%Y-%m'), 0, valor
        FROM CieloParcela
        WHERE dataVenda >= ${start} AND dataVenda <= ${end}${this.filialWhere(
          filialId,
        )}
      ) t
      GROUP BY mes
      ORDER BY mes
    `);

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

    const rows = await this.prisma.$queryRaw<
      {
        filialId: number;
        filial: string;
        trier: any;
        adquirentes: any;
        diferenca: any;
        divergencias: bigint;
        valorDivergencias: any;
        totalGrupos: bigint;
        automaticos: bigint;
      }[]
    >(Prisma.sql`
      WITH
      trier_total AS (
        SELECT COALESCE(filialId, 0) AS filialId, SUM(valor) AS total
        FROM TrierParcela
        WHERE dataEmissao >= ${start} AND dataEmissao <= ${end}${this.bandeiraWhere(
          bandeiras,
        )}
        GROUP BY filialId
      ),
      adq_total AS (
        SELECT COALESCE(filialId, 0) AS filialId, SUM(valor) AS total
        FROM (
          SELECT filialId, valor FROM RedeParcela WHERE dataVenda >= ${start} AND dataVenda <= ${end}
          UNION ALL
          SELECT filialId, valor FROM CieloParcela WHERE dataVenda >= ${start} AND dataVenda <= ${end}
        ) adq
        GROUP BY filialId
      ),
      div_count AS (
        SELECT COALESCE(tp.filialId, rp.filialId, cip.filialId, 0) AS filialId,
               COUNT(DISTINCT cp.id) AS divergencias,
               COALESCE(SUM(CASE WHEN tp.id IS NOT NULL THEN tp.valor ELSE 0 END), 0) AS valorDivergencias
        FROM ConciliacaoParcela cp
        JOIN ConciliacaoParcelaItem cpi ON cpi.conciliacaoParcelaId = cp.id
        LEFT JOIN TrierParcela tp ON tp.id = cpi.trierParcelaId
        LEFT JOIN RedeParcela rp ON rp.id = cpi.redeParcelaId
        LEFT JOIN CieloParcela cip ON cip.id = cpi.cieloParcelaId
        WHERE cp.status = 'DIVERGENTE'
          AND (
            (tp.id IS NOT NULL AND tp.dataEmissao >= ${start} AND tp.dataEmissao <= ${end})
            OR (rp.id IS NOT NULL AND rp.dataVenda >= ${start} AND rp.dataVenda <= ${end})
            OR (cip.id IS NOT NULL AND cip.dataVenda >= ${start} AND cip.dataVenda <= ${end})
          )
        GROUP BY filialId
      ),
      auto_count AS (
        SELECT COALESCE(tp.filialId, rp.filialId, cip.filialId, 0) AS filialId,
               COUNT(DISTINCT cp.id) AS totalGrupos,
               COUNT(DISTINCT CASE WHEN cp.tipoMatch IS NOT NULL AND cp.tipoMatch <> 'MANUAL' THEN cp.id END) AS automaticos
        FROM ConciliacaoParcela cp
        JOIN ConciliacaoParcelaItem cpi ON cpi.conciliacaoParcelaId = cp.id
        LEFT JOIN TrierParcela tp ON tp.id = cpi.trierParcelaId
        LEFT JOIN RedeParcela rp ON rp.id = cpi.redeParcelaId
        LEFT JOIN CieloParcela cip ON cip.id = cpi.cieloParcelaId
        WHERE (
          (tp.id IS NOT NULL AND tp.dataEmissao >= ${start} AND tp.dataEmissao <= ${end})
          OR (rp.id IS NOT NULL AND rp.dataVenda >= ${start} AND rp.dataVenda <= ${end})
          OR (cip.id IS NOT NULL AND cip.dataVenda >= ${start} AND cip.dataVenda <= ${end})
        )
        GROUP BY filialId
      )
      SELECT f.id AS filialId, f.name AS filial,
        COALESCE(tt.total, 0) AS trier,
        COALESCE(at.total, 0) AS adquirentes,
        COALESCE(tt.total, 0) - COALESCE(at.total, 0) AS diferenca,
        COALESCE(dc.divergencias, 0) AS divergencias,
        COALESCE(dc.valorDivergencias, 0) AS valorDivergencias,
        COALESCE(ac.totalGrupos, 0) AS totalGrupos,
        COALESCE(ac.automaticos, 0) AS automaticos
      FROM Filial f
      LEFT JOIN trier_total tt ON tt.filialId = f.id
      LEFT JOIN adq_total at ON at.filialId = f.id
      LEFT JOIN div_count dc ON dc.filialId = f.id
      LEFT JOIN auto_count ac ON ac.filialId = f.id
      WHERE tt.total IS NOT NULL OR at.total IS NOT NULL
      ORDER BY ABS(COALESCE(tt.total, 0) - COALESCE(at.total, 0)) DESC
    `);

    return rows.map((r) => {
      const totalGrupos = Number(r.totalGrupos);
      const automaticos = Number(r.automaticos);
      return {
        filial: r.filial,
        filialId: Number(r.filialId),
        trier: Number(r.trier),
        adquirentes: Number(r.adquirentes),
        diferenca: Number(r.diferenca) * -1,
        divergencias: Number(r.divergencias),
        valorDivergencias: Number(r.valorDivergencias),
        totalGrupos,
        automaticos: Number(r.automaticos),
        taxaAutomatica:
          totalGrupos > 0
            ? Number(((automaticos / totalGrupos) * 100).toFixed(2))
            : 0,
      };
    });
  }

  /**
   * Contagens de grupo por filial (divergencias, valorDivergencias,
   * totalGrupos, automaticos). Apenas as CTEs div_count + auto_count do
   * chartRankingPendencias — sem trier_total/adq_total, que agora são
   * servidos pela tabela FatoCartaoParcelas.
   */
  async rankingGruposPendencias(
    dateRange: { from: string; to: string },
    bandeiras?: string[],
  ) {
    const { start, end } = this.dateParams(dateRange);

    const rows = await this.prisma.$queryRaw<
      {
        filialId: number;
        divergencias: bigint;
        valorDivergencias: any;
        totalGrupos: bigint;
        automaticos: bigint;
      }[]
    >(Prisma.sql`
      WITH
      div_count AS (
        SELECT COALESCE(tp.filialId, rp.filialId, cip.filialId, 0) AS filialId,
               COUNT(DISTINCT cp.id) AS divergencias,
               COALESCE(SUM(CASE WHEN tp.id IS NOT NULL THEN tp.valor ELSE 0 END), 0) AS valorDivergencias
        FROM ConciliacaoParcela cp
        JOIN ConciliacaoParcelaItem cpi ON cpi.conciliacaoParcelaId = cp.id
        LEFT JOIN TrierParcela tp ON tp.id = cpi.trierParcelaId
        LEFT JOIN RedeParcela rp ON rp.id = cpi.redeParcelaId
        LEFT JOIN CieloParcela cip ON cip.id = cpi.cieloParcelaId
        WHERE cp.status = 'DIVERGENTE'
          AND (
            (tp.id IS NOT NULL AND tp.dataEmissao >= ${start} AND tp.dataEmissao <= ${end})
            OR (rp.id IS NOT NULL AND rp.dataVenda >= ${start} AND rp.dataVenda <= ${end})
            OR (cip.id IS NOT NULL AND cip.dataVenda >= ${start} AND cip.dataVenda <= ${end})
          )
        GROUP BY filialId
      ),
      auto_count AS (
        SELECT COALESCE(tp.filialId, rp.filialId, cip.filialId, 0) AS filialId,
               COUNT(DISTINCT cp.id) AS totalGrupos,
               COUNT(DISTINCT CASE WHEN cp.tipoMatch IS NOT NULL AND cp.tipoMatch <> 'MANUAL' THEN cp.id END) AS automaticos
        FROM ConciliacaoParcela cp
        JOIN ConciliacaoParcelaItem cpi ON cpi.conciliacaoParcelaId = cp.id
        LEFT JOIN TrierParcela tp ON tp.id = cpi.trierParcelaId
        LEFT JOIN RedeParcela rp ON rp.id = cpi.redeParcelaId
        LEFT JOIN CieloParcela cip ON cip.id = cpi.cieloParcelaId
        WHERE (
          (tp.id IS NOT NULL AND tp.dataEmissao >= ${start} AND tp.dataEmissao <= ${end})
          OR (rp.id IS NOT NULL AND rp.dataVenda >= ${start} AND rp.dataVenda <= ${end})
          OR (cip.id IS NOT NULL AND cip.dataVenda >= ${start} AND cip.dataVenda <= ${end})
        )
        GROUP BY filialId
      )
      SELECT filialId,
        SUM(divergencias) AS divergencias,
        SUM(valorDivergencias) AS valorDivergencias,
        SUM(totalGrupos) AS totalGrupos,
        SUM(automaticos) AS automaticos
      FROM (
        SELECT filialId, divergencias, valorDivergencias, 0 AS totalGrupos, 0 AS automaticos
        FROM div_count
        UNION ALL
        SELECT filialId, 0, 0, totalGrupos, automaticos
        FROM auto_count
      ) u
      GROUP BY filialId
    `);

    return rows.map((r) => ({
      filialId: Number(r.filialId),
      divergencias: Number(r.divergencias),
      valorDivergencias: Number(r.valorDivergencias),
      totalGrupos: Number(r.totalGrupos),
      automaticos: Number(r.automaticos),
    }));
  }

  async chartRankingDivergencias(
    dateRange: { from: string; to: string },
    filialId?: number,
    bandeiras?: string[],
  ) {
    const { start, end } = this.dateParams(dateRange);
    const t = this.trierWhere(bandeiras, filialId, 'tp');
    const r = this.filialWhere(filialId, 'rp');
    const c = this.filialWhere(filialId, 'cip');

    const statusRows = await this.prisma.$queryRaw<
      { status: string; quantidade: bigint }[]
    >(Prisma.sql`
      SELECT cp.status AS status, COUNT(DISTINCT cp.id) AS quantidade
      FROM ConciliacaoParcela cp
      JOIN ConciliacaoParcelaItem cpi ON cpi.conciliacaoParcelaId = cp.id
      LEFT JOIN TrierParcela tp ON tp.id = cpi.trierParcelaId
      LEFT JOIN RedeParcela rp ON rp.id = cpi.redeParcelaId
      LEFT JOIN CieloParcela cip ON cip.id = cpi.cieloParcelaId
      WHERE (
        (tp.id IS NOT NULL AND tp.dataEmissao >= ${start} AND tp.dataEmissao <= ${end}${t})
        OR (rp.id IS NOT NULL AND rp.dataVenda >= ${start} AND rp.dataVenda <= ${end}${r})
        OR (cip.id IS NOT NULL AND cip.dataVenda >= ${start} AND cip.dataVenda <= ${end}${c})
      )
      GROUP BY cp.status
    `);

    const totalGrupos = statusRows.reduce(
      (acc, r2) => acc + Number(r2.quantidade),
      0,
    );
    const get = (status: string) =>
      Number(statusRows.find((s) => s.status === status)?.quantidade ?? 0);
    const conciliados = get('CONCILIADO');
    const divergentes = get('DIVERGENTE');
    const naoEncontrados = get('NAO_ENCONTRADO');

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

    const observacoes = await this.prisma.$queryRaw<
      { tipo: string; quantidade: bigint; valor: any }[]
    >(Prisma.sql`
      WITH grupos_periodo AS (
        SELECT DISTINCT cp.id
        FROM ConciliacaoParcela cp
        JOIN ConciliacaoParcelaItem cpi ON cpi.conciliacaoParcelaId = cp.id
        LEFT JOIN TrierParcela tp ON tp.id = cpi.trierParcelaId
        LEFT JOIN RedeParcela rp ON rp.id = cpi.redeParcelaId
        LEFT JOIN CieloParcela cip ON cip.id = cpi.cieloParcelaId
        WHERE (
          (tp.id IS NOT NULL AND tp.dataEmissao >= ${start} AND tp.dataEmissao <= ${end}${t})
          OR (rp.id IS NOT NULL AND rp.dataVenda >= ${start} AND rp.dataVenda <= ${end}${r})
          OR (cip.id IS NOT NULL AND cip.dataVenda >= ${start} AND cip.dataVenda <= ${end}${c})
        )
      ),
      grupo_valor AS (
        SELECT cpi.conciliacaoParcelaId AS grupoId,
               COALESCE(SUM(tpv.valor), 0) AS valor
        FROM ConciliacaoParcelaItem cpi
        LEFT JOIN TrierParcela tpv ON tpv.id = cpi.trierParcelaId
        WHERE cpi.conciliacaoParcelaId IN (SELECT id FROM grupos_periodo)
        GROUP BY cpi.conciliacaoParcelaId
      )
      SELECT cpo.tipo AS tipo, COUNT(*) AS quantidade,
             COALESCE(SUM(gv.valor), 0) AS valor
      FROM ConciliacaoParcelaObservacao cpo
      JOIN grupo_valor gv ON gv.grupoId = cpo.conciliacaoParcelaId
      WHERE cpo.conciliacaoParcelaId IN (SELECT id FROM grupos_periodo)
      GROUP BY cpo.tipo
      ORDER BY quantidade DESC
    `);

    const totalObservacoes = observacoes.reduce(
      (acc, o) => acc + Number(o.quantidade),
      0,
    );
    const totalValorObservacoes = observacoes.reduce(
      (acc, o) => acc + Number(o.valor),
      0,
    );

    const ranking = observacoes.map((o) => {
      const valor = Number(o.valor);
      return {
        tipo: o.tipo,
        quantidade: Number(o.quantidade),
        percentual:
          totalObservacoes > 0
            ? Number(((Number(o.quantidade) / totalObservacoes) * 100).toFixed(2))
            : 0,
        valor,
        materialidade:
          totalValorObservacoes > 0
            ? Number(((valor / totalValorObservacoes) * 100).toFixed(2))
            : 0,
      };
    });

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

  async agingPendencias(
    dateRange: { from: string; to: string },
    filialId?: number,
    bandeiras?: string[],
  ) {
    const { start, end } = this.dateParams(dateRange);

    const rows = await this.prisma.$queryRaw<
      { faixa: string; quantidade: bigint }[]
    >(Prisma.sql`
      SELECT faixa, COUNT(*) AS quantidade
      FROM (
        SELECT DISTINCT cp.id,
          CASE
            WHEN DATEDIFF(CURDATE(), cp.createdAt) <= 2 THEN '0-2'
            WHEN DATEDIFF(CURDATE(), cp.createdAt) <= 7 THEN '3-7'
            WHEN DATEDIFF(CURDATE(), cp.createdAt) <= 30 THEN '8-30'
            ELSE '30+'
          END AS faixa
        FROM ConciliacaoParcela cp
        JOIN ConciliacaoParcelaItem cpi ON cpi.conciliacaoParcelaId = cp.id
        LEFT JOIN TrierParcela tp ON tp.id = cpi.trierParcelaId
        LEFT JOIN RedeParcela rp ON rp.id = cpi.redeParcelaId
        LEFT JOIN CieloParcela cip ON cip.id = cpi.cieloParcelaId
        WHERE cp.status IN ('DIVERGENTE', 'NAO_ENCONTRADO')
          AND (
            (tp.id IS NOT NULL AND tp.dataEmissao >= ${start} AND tp.dataEmissao <= ${end}${this.trierWhere(
              bandeiras,
              filialId,
              'tp',
            )})
            OR (rp.id IS NOT NULL AND rp.dataVenda >= ${start} AND rp.dataVenda <= ${end}${this.filialWhere(
              filialId,
              'rp',
            )})
            OR (cip.id IS NOT NULL AND cip.dataVenda >= ${start} AND cip.dataVenda <= ${end}${this.filialWhere(
              filialId,
              'cip',
            )})
          )
      ) d
      GROUP BY faixa
    `);

    const order = ['0-2', '3-7', '8-30', '30+'];
    return order.map((o) => ({
      faixa: `${o} dias`,
      quantidade: Number(rows.find((r) => r.faixa === o)?.quantidade ?? 0),
    }));
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
    const hojeStart = hojeStr + 'T00:00:00.000Z';
    const hojeEnd = hojeStr + 'T23:59:59.999Z';

    const daqui7 = new Date(hoje);
    daqui7.setDate(daqui7.getDate() + 7);
    const daqui15 = new Date(hoje);
    daqui15.setDate(daqui15.getDate() + 15);
    const daqui30 = new Date(hoje);
    daqui30.setDate(daqui30.getDate() + 30);
    const daqui60 = new Date(hoje);
    daqui60.setDate(daqui60.getDate() + 60);

    const faixaSQL = (
      tabela: 'TrierParcela' | 'RedeParcela' | 'CieloParcela',
      colVenc: string,
      colData: string,
    ) => {
      const extra =
        tabela === 'TrierParcela'
          ? this.trierWhere(bandeiras, filialId)
          : this.filialWhere(filialId);
      return Prisma.sql`
        SELECT
          COALESCE(SUM(CASE WHEN ${Prisma.raw(colVenc)} <= ${hojeEnd} THEN valor END), 0) AS vencido,
          COALESCE(SUM(CASE WHEN ${Prisma.raw(colVenc)} >= ${hojeStart} AND ${Prisma.raw(colVenc)} <= ${hojeEnd} THEN valor END), 0) AS hoje,
          COALESCE(SUM(CASE WHEN ${Prisma.raw(colVenc)} > ${hojeEnd} AND ${Prisma.raw(colVenc)} <= ${daqui7.toISOString()} THEN valor END), 0) AS d1_7,
          COALESCE(SUM(CASE WHEN ${Prisma.raw(colVenc)} > ${daqui7.toISOString()} AND ${Prisma.raw(colVenc)} <= ${daqui15.toISOString()} THEN valor END), 0) AS d8_15,
          COALESCE(SUM(CASE WHEN ${Prisma.raw(colVenc)} > ${daqui15.toISOString()} AND ${Prisma.raw(colVenc)} <= ${daqui30.toISOString()} THEN valor END), 0) AS d16_30,
          COALESCE(SUM(CASE WHEN ${Prisma.raw(colVenc)} > ${daqui30.toISOString()} AND ${Prisma.raw(colVenc)} <= ${daqui60.toISOString()} THEN valor END), 0) AS d31_60,
          COALESCE(SUM(CASE WHEN ${Prisma.raw(colVenc)} > ${daqui60.toISOString()} THEN valor END), 0) AS d60_plus
        FROM ${Prisma.raw(tabela)}
        WHERE ${Prisma.raw(colData)} >= ${start} AND ${Prisma.raw(colData)} <= ${end}${extra}
      `;
    };

    const trierQ = faixaSQL('TrierParcela', 'dataVencimento', 'dataEmissao');
    const redeQ = faixaSQL('RedeParcela', 'vencimento', 'dataVenda');
    const cieloQ = faixaSQL('CieloParcela', 'dataVencimento', 'dataVenda');

    const [trierRow, redeRow, cieloRow] = await Promise.all([
      this.prisma.$queryRaw<any[]>(trierQ),
      this.prisma.$queryRaw<any[]>(redeQ),
      this.prisma.$queryRaw<any[]>(cieloQ),
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

    const chartLinhas = await this.prisma.$queryRaw<
      { dia: string; trier: any; adquirentes: any }[]
    >(Prisma.sql`
      SELECT dia, SUM(trier) AS trier, SUM(adq) AS adquirentes
      FROM (
        SELECT DATE(dataVencimento) AS dia, valor AS trier, 0 AS adq
        FROM TrierParcela
        WHERE dataEmissao >= ${start} AND dataEmissao <= ${end}${this.trierWhere(
          bandeiras,
          filialId,
        )}
        UNION ALL
        SELECT DATE(vencimento), 0, valor
        FROM RedeParcela
        WHERE dataVenda >= ${start} AND dataVenda <= ${end}${this.filialWhere(
          filialId,
        )}
        UNION ALL
        SELECT DATE(dataVencimento), 0, valor
        FROM CieloParcela
        WHERE dataVenda >= ${start} AND dataVenda <= ${end}${this.filialWhere(
          filialId,
        )}
      ) t
      GROUP BY dia
      ORDER BY dia
    `);

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