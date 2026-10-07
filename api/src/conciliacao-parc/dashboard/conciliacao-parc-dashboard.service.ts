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

  /**
   * Fragmentos de filtro para `Receivable` (alias `r`).
   *
   * `Receivable` não tem bandeira própria nem origem — agrega parcelas da
   * Trier, Rede e Cielo (cada uma com `receivableId` indexado). Origem e
   * bandeira atravessam, então, essas parcelas ligadas:
   *
   *  - origem: `EXISTS` na tabela da origem (TRIER/REDE/CIELO);
   *  - bandeira em modo `excluir`: uma parcela Trier/Cielo com bandeira
   *    excluída derruba o recebível inteiro (os buckets são homogêneos por
   *    adquirente; no INDEFINIDO, misturado, perder junto é o lado grosso);
   *  - bandeira em modo `incluir`: vale ao menos uma parcela Trier/Cielo com
   *    bandeira na lista ou ser da Rede — Rede não é filtrável por bandeira.
   */
  private recebivelOrigem(adquirentes?: string[]): Prisma.Sql {
    if (!adquirentes?.length) return Prisma.empty;
    const tabelas: Record<string, { tabela: string; alias: string }> = {
      TRIER: { tabela: 'TrierParcela', alias: 'tp' },
      REDE: { tabela: 'RedeParcela', alias: 'rp' },
      CIELO: { tabela: 'CieloParcela', alias: 'cp' },
    };
    const ramos = [...new Set(adquirentes)]
      .filter((o) => tabelas[o])
      .map((o) => {
        const { tabela, alias } = tabelas[o];
        return Prisma.sql`EXISTS (
          SELECT 1 FROM ${Prisma.raw(tabela)} ${Prisma.raw(alias)}
          WHERE ${Prisma.raw(alias)}.receivableId = r.id
        )`;
      });
    return ramos.length
      ? Prisma.sql` AND (${Prisma.join(ramos, ' OR ')})`
      : Prisma.empty;
  }

  private recebivelBandeira(
    bandeiras?: string[],
    modo: 'incluir' | 'excluir' = 'excluir',
  ): Prisma.Sql {
    if (!bandeiras?.length) return Prisma.empty;
    if (modo === 'incluir') {
      return Prisma.sql`
        AND (
          EXISTS (
            SELECT 1 FROM TrierParcela tp
            WHERE tp.receivableId = r.id AND tp.bandeira IN (${Prisma.join(
              bandeiras,
            )})
          )
          OR EXISTS (
            SELECT 1 FROM CieloParcela cp
            WHERE cp.receivableId = r.id AND cp.bandeira IN (${Prisma.join(
              bandeiras,
            )})
          )
          OR EXISTS (
            SELECT 1 FROM RedeParcela rp WHERE rp.receivableId = r.id
          )
        )
      `;
    }
    return Prisma.sql`
      AND NOT EXISTS (
        SELECT 1 FROM TrierParcela tp
        WHERE tp.receivableId = r.id AND tp.bandeira IN (${Prisma.join(
          bandeiras,
        )})
      )
      AND NOT EXISTS (
        SELECT 1 FROM CieloParcela cp
        WHERE cp.receivableId = r.id AND cp.bandeira IN (${Prisma.join(
          bandeiras,
        )})
      )
    `;
  }

  /**
   * Filtro de situação sobre `Receivable.status`. A UI usa os rótulos das
   * parcelas (PENDENTE/DIVERGENTE/CONCILIADO); no recebível o "Pendente" é
   * `ENVIADO_ERP` (aguardando baixa) ou `ABERTO`.
   */
  private recebivelStatus(status?: string[]): Prisma.Sql {
    if (!status?.length) return Prisma.empty;
    const mapa: Record<string, string[]> = {
      PENDENTE: ['ABERTO', 'ENVIADO_ERP'],
      CONCILIADO: ['CONCILIADO'],
      DIVERGENTE: ['DIVERGENTE'],
    };
    const valores = [...new Set(status.flatMap((s) => mapa[s] ?? []))];
    if (!valores.length) return Prisma.empty;
    return Prisma.sql` AND r.status IN (${Prisma.join(valores)})`;
  }

  /**
   * `WHERE` dos recebíveis (alias `r`) com todos os filtros do dashboard
   * a-receber — período, filial, origem, bandeiras e situação. Compartilhado
   * por barras, totais, faixas de vencimento e a lista de pendências.
   *
   * `comPeriodo = false` remove só o range de `dataRecebimento` (usado pela
   * base das faixas fora da "Vencido", que são globais); filial, origem,
   * bandeiras e situação continuam valendo.
   */
  private recebiveisWhere(
    dateRange: { from: string; to: string },
    filialId?: number,
    bandeiras?: string[],
    bandeirasModo: 'incluir' | 'excluir' = 'excluir',
    adquirentes?: string[],
    status?: string[],
    comPeriodo = true,
  ): Prisma.Sql {
    const { start, end } = this.dateParams(dateRange);
    return Prisma.sql`
      WHERE ${
        comPeriodo
          ? Prisma.sql`r.dataRecebimento >= ${start} AND r.dataRecebimento <= ${end}`
          : Prisma.sql`(1 = 1)`
      }
        ${this.filialWhere(filialId, 'r')}
        ${this.recebivelOrigem(adquirentes)}
        ${this.recebivelBandeira(bandeiras, bandeirasModo)}
        ${this.recebivelStatus(status)}
    `;
  }

  /** Fragmento ` AND [alias.]bandeira IN|NOT IN (...)` usado nas faixas. */
  private bandeiraFaixa(
    bandeiras?: string[],
    modo: 'incluir' | 'excluir' = 'excluir',
    alias = '',
  ): Prisma.Sql {
    if (!bandeiras?.length) return Prisma.empty;
    const prefix = alias ? `${alias}.` : '';
    const op = modo === 'incluir' ? 'IN' : 'NOT IN';
    return Prisma.sql` AND ${Prisma.raw(prefix)}bandeira ${Prisma.raw(op)} (${Prisma.join(
      bandeiras,
    )})`;
  }

  /**
   * Corpo da CTE `gp`: ids de ConciliacaoParcela com ao menos um item de
   * parcela dentro do período.
   *
   * Cada ConciliacaoParcelaItem tem exatamente uma FK preenchida e `origem`
   * mapeia 1:1 para ela (verificado: 0 itens com mais de uma FK). Os três
   * ramos são portanto disjuntos e `UNION` (deduplicante) equivale ao
   * `SELECT DISTINCT` do padrão antigo.
   *
   * O ganho está em trocar o filtro `OR` de três ramos sobre três LEFT JOIN.
   * No padrão antigo o MySQL varre ConciliacaoParcela inteira, expande os
   * 410k itens, faz 3 lookups por item e só depois aplica a data no Filter —
   * os índices (filialId, data) das três tabelas nunca eram usados. Aqui cada
   * ramo parte da própria tabela de parcela e filtra pela data diretamente.
   */
  private gruposPeriodoSql(
    dateRange: { from: string; to: string },
    filialId?: number,
    bandeiras?: string[],
    origens?: string[],
  ) {
    const { start, end } = this.dateParams(dateRange);

    // Cada ramo do UNION é a origem correspondente. Filtrar a origem é
    // simplesmente não emitir o ramo: um grupo entra no conjunto se tem ao
    // menos um item de parcela dentro do período E dentro das origens
    // selecionadas. Sem `origens`, os três ramos entram (comportamento
    // antigo).
    const ramos: Prisma.Sql[] = [];

    if (!origens?.length || origens.includes('TRIER')) {
      ramos.push(Prisma.sql`
        SELECT cpi.conciliacaoParcelaId AS id
        FROM ConciliacaoParcelaItem cpi
        JOIN TrierParcela tp ON tp.id = cpi.trierParcelaId
        WHERE tp.dataEmissao >= ${start} AND tp.dataEmissao <= ${end}${this.trierWhere(
          bandeiras,
          filialId,
          'tp',
        )}
      `);
    }

    if (!origens?.length || origens.includes('REDE')) {
      ramos.push(Prisma.sql`
        SELECT cpi.conciliacaoParcelaId AS id
        FROM ConciliacaoParcelaItem cpi
        JOIN RedeParcela rp ON rp.id = cpi.redeParcelaId
        WHERE rp.dataVenda >= ${start} AND rp.dataVenda <= ${end}${this.filialWhere(
          filialId,
          'rp',
        )}
      `);
    }

    if (!origens?.length || origens.includes('CIELO')) {
      ramos.push(Prisma.sql`
        SELECT cpi.conciliacaoParcelaId AS id
        FROM ConciliacaoParcelaItem cpi
        JOIN CieloParcela cip ON cip.id = cpi.cieloParcelaId
        WHERE cip.dataVenda >= ${start} AND cip.dataVenda <= ${end}${this.filialWhere(
          filialId,
          'cip',
        )}
      `);
    }

    // Nenhuma origem selecionada não pode gerar `UNION` vazio, que é
    // sintaticamente inválido. Os ramos já foram omitidos nesse caso; devolve
    // um conjunto vazio para a consulta não quebrar.
    if (!ramos.length) {
      return Prisma.sql`SELECT NULL AS id WHERE 1 = 0`;
    }

    return Prisma.join(ramos, ' UNION ');
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
               COUNT(DISTINCT cp.id) AS totalGrupos
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
        COALESCE(ac.totalGrupos, 0) AS totalGrupos
      FROM Filial f
      LEFT JOIN trier_total tt ON tt.filialId = f.id
      LEFT JOIN adq_total at ON at.filialId = f.id
      LEFT JOIN div_count dc ON dc.filialId = f.id
      LEFT JOIN auto_count ac ON ac.filialId = f.id
      WHERE tt.total IS NOT NULL OR at.total IS NOT NULL
      ORDER BY ABS(COALESCE(tt.total, 0) - COALESCE(at.total, 0)) DESC
    `);

    return rows.map((r) => ({
      filial: r.filial,
      filialId: Number(r.filialId),
      trier: Number(r.trier),
      adquirentes: Number(r.adquirentes),
      diferenca: Number(r.diferenca) * -1,
      divergencias: Number(r.divergencias),
      valorDivergencias: Number(r.valorDivergencias),
      totalGrupos: Number(r.totalGrupos),
    }));
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
    origens?: string[],
  ) {
    const { start, end } = this.dateParams(dateRange);
    const t = this.bandeiraWhere(bandeiras, 'tp');

    // Mesmo mecanismo de `gruposPeriodoSql`: a origem selecionada decide se o
    // ramo entra no conjunto. Só os ramos reais são emitidos — um ramo "vazio"
    // (`WHERE 1 = 0`) seria o primeiro do `UNION ALL` quando a origem escolhida
    // não é a Trier, e aí o MySQL passaria a tipar as colunas da CTE a partir
    // de literais NULL, coagindo o `filialId` e o `trierValor` das linhas reais
    // das outras origens.
    //
    // `trierValor` vem NULL nos ramos de Rede/Cielo de propósito: o `SUM` de
    // divergências usa o valor da parcela do Trier, que é quem carrega o
    // importe comparado.
    const ramos: Prisma.Sql[] = [];

    if (!origens?.length || origens.includes('TRIER')) {
      ramos.push(Prisma.sql`
        SELECT cp.id AS id, cp.status AS status, cp.tipoMatch AS tipoMatch,
               tp.filialId AS filialId, tp.valor AS trierValor
        FROM ConciliacaoParcelaItem cpi
        JOIN ConciliacaoParcela cp ON cp.id = cpi.conciliacaoParcelaId
        JOIN TrierParcela tp ON tp.id = cpi.trierParcelaId
        WHERE tp.dataEmissao >= ${start} AND tp.dataEmissao <= ${end}${t}
      `);
    }

    if (!origens?.length || origens.includes('REDE')) {
      ramos.push(Prisma.sql`
        SELECT cp.id AS id, cp.status AS status, cp.tipoMatch AS tipoMatch,
               rp.filialId AS filialId, NULL AS trierValor
        FROM ConciliacaoParcelaItem cpi
        JOIN ConciliacaoParcela cp ON cp.id = cpi.conciliacaoParcelaId
        JOIN RedeParcela rp ON rp.id = cpi.redeParcelaId
        WHERE rp.dataVenda >= ${start} AND rp.dataVenda <= ${end}
      `);
    }

    if (!origens?.length || origens.includes('CIELO')) {
      ramos.push(Prisma.sql`
        SELECT cp.id AS id, cp.status AS status, cp.tipoMatch AS tipoMatch,
               cip.filialId AS filialId, NULL AS trierValor
        FROM ConciliacaoParcelaItem cpi
        JOIN ConciliacaoParcela cp ON cp.id = cpi.conciliacaoParcelaId
        JOIN CieloParcela cip ON cip.id = cpi.cieloParcelaId
        WHERE cip.dataVenda >= ${start} AND cip.dataVenda <= ${end}
      `);
    }

    // Só alcançável se `origens` vier com valores fora das três origens, o
    // que o controller já recusa. Fica aqui para o `UNION` nunca ser vazio —
    // e o ramo abaixo já vem tipado, para não virar a fonte do tipo da CTE.
    const itemFilial = ramos.length
      ? Prisma.join(ramos, ' UNION ALL ')
      : Prisma.sql`
          SELECT CAST(NULL AS SIGNED) AS id,
                 CAST(NULL AS CHAR(20)) AS status,
                 CAST(NULL AS CHAR(20)) AS tipoMatch,
                 CAST(NULL AS SIGNED) AS filialId,
                 CAST(NULL AS DECIMAL(20,2)) AS trierValor
          WHERE 1 = 0
        `;

    const rows = await this.prisma.$queryRaw<
      {
        filialId: number;
        divergencias: bigint;
        valorDivergencias: any;
        totalGrupos: bigint;
      }[]
    >(Prisma.sql`
      WITH item_filial AS (
        ${itemFilial}
      ),
      agg AS (
        SELECT COALESCE(filialId, 0) AS filialId,
               COUNT(DISTINCT CASE WHEN status = 'DIVERGENTE' THEN id END) AS divergencias,
               COALESCE(SUM(CASE WHEN status = 'DIVERGENTE' THEN trierValor ELSE 0 END), 0) AS valorDivergencias,
               COUNT(DISTINCT id) AS totalGrupos
        FROM item_filial
        GROUP BY filialId
      )
      SELECT filialId, divergencias, valorDivergencias, totalGrupos
      FROM agg
    `);

    return rows.map((r) => ({
      filialId: Number(r.filialId),
      divergencias: Number(r.divergencias),
      valorDivergencias: Number(r.valorDivergencias),
      totalGrupos: Number(r.totalGrupos),
    }));
  }

  /**
   * Resumo de grupos + ranking de observações + aging de pendências, em UMA
   * query.
   *
   * Antes eram três queries (duas delas sequenciais dentro de
   * chartRankingDivergencias) que reconstruíam o mesmo conjunto de grupos do
   * período. Todas compartilham a CTE `gp`, então agora o MySQL a materializa
   * uma vez e deriva as três saídas dela.
   *
   * `kind` discrimina o agregado no resultado; os contadores por status e as
   * faixas de aging não se sobrepõem entre si.
   */
  async resumoConciliacao(
    dateRange: { from: string; to: string },
    filialId?: number,
    bandeiras?: string[],
    origens?: string[],
  ) {
    const rows = await this.prisma.$queryRaw<
      { kind: string; label: string; quantidade: bigint; valor: any }[]
    >(Prisma.sql`
      WITH gp AS (
        ${this.gruposPeriodoSql(dateRange, filialId, bandeiras, origens)}
      ),
      g AS (
        SELECT cp.id AS id, cp.status AS status, cp.createdAt AS createdAt
        FROM ConciliacaoParcela cp
        JOIN gp ON gp.id = cp.id
      ),
      gv AS (
        SELECT cpi.conciliacaoParcelaId AS grupoId,
               COALESCE(SUM(tpv.valor), 0) AS valor
        FROM ConciliacaoParcelaItem cpi
        JOIN g ON g.id = cpi.conciliacaoParcelaId
        LEFT JOIN TrierParcela tpv ON tpv.id = cpi.trierParcelaId
        GROUP BY cpi.conciliacaoParcelaId
      )
      SELECT 'status' AS kind, g.status AS label, COUNT(*) AS quantidade,
             CAST(NULL AS DECIMAL(20,2)) AS valor
      FROM g
      GROUP BY g.status
      UNION ALL
      SELECT 'aging' AS kind,
        CASE
          WHEN DATEDIFF(CURDATE(), g.createdAt) <= 2 THEN '0-2'
          WHEN DATEDIFF(CURDATE(), g.createdAt) <= 7 THEN '3-7'
          WHEN DATEDIFF(CURDATE(), g.createdAt) <= 30 THEN '8-30'
          ELSE '30+'
        END AS label,
        COUNT(*) AS quantidade,
        CAST(NULL AS DECIMAL(20,2)) AS valor
      FROM g
      WHERE g.status IN ('DIVERGENTE', 'NAO_ENCONTRADO')
      GROUP BY 2
      UNION ALL
      SELECT 'obs' AS kind, cpo.tipo AS label, COUNT(*) AS quantidade,
             COALESCE(SUM(gv.valor), 0) AS valor
      FROM ConciliacaoParcelaObservacao cpo
      JOIN gv ON gv.grupoId = cpo.conciliacaoParcelaId
      GROUP BY cpo.tipo
    `);

    const statusRows = rows.filter((r) => r.kind === 'status');
    const agingRows = rows.filter((r) => r.kind === 'aging');
    const observacoes = rows.filter((r) => r.kind === 'obs');

    const totalGrupos = statusRows.reduce(
      (acc, r2) => acc + Number(r2.quantidade),
      0,
    );
    const get = (status: string) =>
      Number(statusRows.find((s) => s.label === status)?.quantidade ?? 0);
    const conciliados = get('CONCILIADO');
    const divergentes = get('DIVERGENTE');
    const naoEncontrados = get('NAO_ENCONTRADO');

    const agingOrder = ['0-2', '3-7', '8-30', '30+'];
    const aging = agingOrder.map((o) => ({
      faixa: `${o} dias`,
      quantidade: Number(agingRows.find((r) => r.label === o)?.quantidade ?? 0),
    }));

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
        aging,
      };
    }

    const orderedObs = [...observacoes].sort(
      (a, b) => Number(b.quantidade) - Number(a.quantidade),
    );

    const totalObservacoes = orderedObs.reduce(
      (acc, o) => acc + Number(o.quantidade),
      0,
    );
    const totalValorObservacoes = orderedObs.reduce(
      (acc, o) => acc + Number(o.valor),
      0,
    );

    const ranking = orderedObs.map((o) => {
      const valor = Number(o.valor);
      return {
        tipo: o.label,
        quantidade: Number(o.quantidade),
        percentual:
          totalObservacoes > 0
            ? Number(
                ((Number(o.quantidade) / totalObservacoes) * 100).toFixed(2),
              )
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
      aging,
    };
  }

  async aReceber(
    dateRange: { from: string; to: string },
    filialId?: number,
    bandeiras?: string[],
    bandeirasModo: 'incluir' | 'excluir' = 'excluir',
    adquirentes?: string[],
    status?: string[],
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

    // Filtro de origem pula o ramo da tabela que não foi selecionada (mesma
    // ideia dos ramos da CTE de grupos). Nas faixas "Trier" é o ramo da Trier
    // e "Adquirentes" é Rede + Cielo; bandeira vale para Trier e Cielo (que
    // têm bandeira), Rede não é filtrável.
    const origensSelecionadas = adquirentes?.length
      ? new Set(adquirentes)
      : null;
    const inclui = (origem: string) =>
      !origensSelecionadas || origensSelecionadas.has(origem);

    // Só a faixa "Vencido" é interferida pelo range do período: ela soma os
    // vencimentos DENTRO do período que já venceram (≤ hoje). As demais
    // faixas ignoram o range e exibem o valor coerente (global) do pipeline
    // de vencimentos relativo a hoje.
    const faixaSQL = (
      tabela: 'TrierParcela' | 'RedeParcela' | 'CieloParcela',
      colVenc: string,
      comBandeira: boolean,
    ) => {
      const bandeira = comBandeira
        ? this.bandeiraFaixa(bandeiras, bandeirasModo)
        : Prisma.empty;
      return Prisma.sql`
        SELECT
          COALESCE(SUM(CASE WHEN ${Prisma.raw(colVenc)} >= ${start} AND ${Prisma.raw(colVenc)} <= ${end} AND ${Prisma.raw(colVenc)} <= ${hojeEnd} THEN valor END), 0) AS vencido,
          COALESCE(SUM(CASE WHEN ${Prisma.raw(colVenc)} >= ${hojeStart} AND ${Prisma.raw(colVenc)} <= ${hojeEnd} THEN valor END), 0) AS hoje,
          COALESCE(SUM(CASE WHEN ${Prisma.raw(colVenc)} > ${hojeEnd} AND ${Prisma.raw(colVenc)} <= ${daqui7.toISOString()} THEN valor END), 0) AS d1_7,
          COALESCE(SUM(CASE WHEN ${Prisma.raw(colVenc)} > ${daqui7.toISOString()} AND ${Prisma.raw(colVenc)} <= ${daqui15.toISOString()} THEN valor END), 0) AS d8_15,
          COALESCE(SUM(CASE WHEN ${Prisma.raw(colVenc)} > ${daqui15.toISOString()} AND ${Prisma.raw(colVenc)} <= ${daqui30.toISOString()} THEN valor END), 0) AS d16_30,
          COALESCE(SUM(CASE WHEN ${Prisma.raw(colVenc)} > ${daqui30.toISOString()} AND ${Prisma.raw(colVenc)} <= ${daqui60.toISOString()} THEN valor END), 0) AS d31_60,
          COALESCE(SUM(CASE WHEN ${Prisma.raw(colVenc)} > ${daqui60.toISOString()} THEN valor END), 0) AS d60_plus
        FROM ${Prisma.raw(tabela)}
        WHERE (1 = 1)${bandeira}${this.filialWhere(filialId)}
      `;
    };

    const trierQ = faixaSQL('TrierParcela', 'dataVencimento', true);
    const redeQ = faixaSQL('RedeParcela', 'vencimento', false);
    const cieloQ = faixaSQL('CieloParcela', 'dataVencimento', true);

    const ZERO = {
      vencido: 0,
      hoje: 0,
      d1_7: 0,
      d8_15: 0,
      d16_30: 0,
      d31_60: 0,
      d60_plus: 0,
    };
    const [trierRow, redeRow, cieloRow] = await Promise.all([
      inclui('TRIER')
        ? this.prisma.$queryRaw<any[]>(trierQ)
        : Promise.resolve([ZERO]),
      inclui('REDE')
        ? this.prisma.$queryRaw<any[]>(redeQ)
        : Promise.resolve([ZERO]),
      inclui('CIELO')
        ? this.prisma.$queryRaw<any[]>(cieloQ)
        : Promise.resolve([ZERO]),
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
    const recebiveisWhere = this.recebiveisWhere(
      dateRange,
      filialId,
      bandeiras,
      bandeirasModo,
      adquirentes,
      status,
    );
    // Mesmos filtros sem o range de período — base das faixas fora da
    // "Vencido", que exibem o pipeline global coerente.
    const recebiveisWhereGlobal = this.recebiveisWhere(
      dateRange,
      filialId,
      bandeiras,
      bandeirasModo,
      adquirentes,
      status,
      false,
    );

    // Buckets de vencimento do lado dos recebíveis, com as mesmas 7 faixas
    // das parcelas (Vencido/Hoje/1-7/.../60+). Cada faixa ganha `_esp`
    // (valorEsperado) e `_rec` (valorRecebido) para as colunas "Vencidos no
    // período", "Recebidos de fato" e "Falta receber" da tabela. Assim como
    // nas parcelas, só o "vencido" carrega o range do período — a base da
    // query é `recebiveisWhereGlobal` (sem o range) e o range entra dentro
    // do CASE do vencido.
    const condicoesFaixa: Record<string, Prisma.Sql> = {
      vencido: Prisma.sql`r.dataRecebimento >= ${start} AND r.dataRecebimento <= ${end} AND r.dataRecebimento <= ${hojeEnd}`,
      hoje: Prisma.sql`r.dataRecebimento >= ${hojeStart} AND r.dataRecebimento <= ${hojeEnd}`,
      d1_7: Prisma.sql`r.dataRecebimento > ${hojeEnd} AND r.dataRecebimento <= ${daqui7.toISOString()}`,
      d8_15: Prisma.sql`r.dataRecebimento > ${daqui7.toISOString()} AND r.dataRecebimento <= ${daqui15.toISOString()}`,
      d16_30: Prisma.sql`r.dataRecebimento > ${daqui15.toISOString()} AND r.dataRecebimento <= ${daqui30.toISOString()}`,
      d31_60: Prisma.sql`r.dataRecebimento > ${daqui30.toISOString()} AND r.dataRecebimento <= ${daqui60.toISOString()}`,
      d60_plus: Prisma.sql`r.dataRecebimento > ${daqui60.toISOString()}`,
    };
    const colunasRecFaixa = keys.flatMap((k) => [
      Prisma.sql`COALESCE(SUM(CASE WHEN ${condicoesFaixa[k]} THEN r.valorEsperado END), 0) AS ${Prisma.raw(
        `${k}_esp`,
      )}`,
      Prisma.sql`COALESCE(SUM(CASE WHEN ${condicoesFaixa[k]} THEN COALESCE(r.valorRecebido, 0) END), 0) AS ${Prisma.raw(
        `${k}_rec`,
      )}`,
    ]);

    const [chartBarras, totais, recFaixa] = await Promise.all([
      this.prisma.$queryRaw<
        {
          dia: string;
          vencimento: any;
          recebimento: any;
          semBaixa: any;
          conciliados: any;
          divergentes: any;
        }[]
      >(Prisma.sql`
        SELECT
          DATE(r.dataRecebimento) AS dia,
          COALESCE(SUM(r.valorEsperado), 0) AS vencimento,
          COALESCE(SUM(r.valorRecebido), 0) AS recebimento,
          SUM(CASE WHEN r.valorRecebido IS NULL THEN 1 ELSE 0 END) AS semBaixa,
          SUM(CASE WHEN r.status = 'CONCILIADO' THEN 1 ELSE 0 END) AS conciliados,
          SUM(CASE WHEN r.status = 'DIVERGENTE' THEN 1 ELSE 0 END) AS divergentes
        FROM Receivable r
        ${recebiveisWhere}
        GROUP BY DATE(r.dataRecebimento)
        ORDER BY dia
      `),
      this.prisma.$queryRaw<
        {
          recebiveis: any;
          vencimento: any;
          recebimento: any;
          conciliados: any;
          divergentes: any;
          semBaixa: any;
        }[]
      >(Prisma.sql`
        SELECT
          COUNT(*) AS recebiveis,
          COALESCE(SUM(r.valorEsperado), 0) AS vencimento,
          COALESCE(SUM(r.valorRecebido), 0) AS recebimento,
          COALESCE(
            SUM(CASE WHEN r.status = 'CONCILIADO' THEN 1 ELSE 0 END),
            0
          ) AS conciliados,
          COALESCE(
            SUM(CASE WHEN r.status = 'DIVERGENTE' THEN 1 ELSE 0 END),
            0
          ) AS divergentes,
          SUM(CASE WHEN r.valorRecebido IS NULL THEN 1 ELSE 0 END) AS semBaixa
        FROM Receivable r
        ${recebiveisWhere}
      `),
      this.prisma.$queryRaw<Record<string, any>[]>(Prisma.sql`
        SELECT ${Prisma.join(colunasRecFaixa, ', ')}
        FROM Receivable r
        ${recebiveisWhereGlobal}
      `),
    ]);

    const vencimentoTotal = Number(totais[0]?.vencimento || 0);
    const recebimentoTotal = Number(totais[0]?.recebimento || 0);

    const faixas = labels.map((label, i) => {
      const k = keys[i];
      const trier = Number(trierRow[0]?.[k] || 0);
      const adquirentes =
        Number(redeRow[0]?.[k] || 0) + Number(cieloRow[0]?.[k] || 0);
      const diferenca =
        Math.abs(adquirentes - trier) < 0.01 ? 0 : adquirentes - trier;
      const vencidos = Number(recFaixa[0]?.[`${k}_esp`] ?? 0);
      const recebidos = Number(recFaixa[0]?.[`${k}_rec`] ?? 0);
      return {
        label,
        trier,
        adquirentes,
        diferenca: Number(diferenca.toFixed(2)),
        vencidos: Number(vencidos.toFixed(2)),
        recebidos: Number(recebidos.toFixed(2)),
        faltaReceber: Math.round((vencidos - recebidos) * 100) / 100,
      };
    });

    return {
      faixas,
      chartBarras: chartBarras.map((linha) => ({
        data: linha.dia,
        vencimento: Number(linha.vencimento || 0),
        recebimento: Number(linha.recebimento || 0),
        semBaixa: Number(linha.semBaixa || 0),
        conciliados: Number(linha.conciliados || 0),
        divergentes: Number(linha.divergentes || 0),
      })),
      totais: {
        recebiveis: Number(totais[0]?.recebiveis || 0),
        vencimento: vencimentoTotal,
        recebimento: recebimentoTotal,
        saldo: Math.round((vencimentoTotal - recebimentoTotal) * 100) / 100,
        conciliados: Number(totais[0]?.conciliados || 0),
        divergentes: Number(totais[0]?.divergentes || 0),
        semBaixa: Number(totais[0]?.semBaixa || 0),
      },
    };
  }

  /**
   * Recebíveis com saldo pendente ("falta receber") no mesmo filtro do
   * dashboard a-receber — é o que o dialog do card "Saldo (falta receber)"
   * lista. `falta` = esperado ainda não baixado: `valorRecebido` nulo (nada
   * recebido) ou menor que `valorEsperado` (baixa parcial/divergente).
   */
  async pendentesReceber(
    dateRange: { from: string; to: string },
    filialId?: number,
    bandeiras?: string[],
    bandeirasModo: 'incluir' | 'excluir' = 'excluir',
    adquirentes?: string[],
    status?: string[],
  ) {
    const pendenteWhere = Prisma.sql`${this.recebiveisWhere(
      dateRange,
      filialId,
      bandeiras,
      bandeirasModo,
      adquirentes,
      status,
    )} AND (r.valorRecebido IS NULL OR r.valorRecebido < r.valorEsperado)`;

    const [rows, aggr] = await Promise.all([
      this.prisma.$queryRaw<
        {
          id: number;
          adquirente: string;
          dataRecebimento: Date;
          valorEsperado: any;
          valorRecebido: any;
          diferenca: any;
          status: string;
          movimentoTrierId: number | null;
          filialId: number;
          nTrier: any;
          nRede: any;
          nCielo: any;
          bandeirasTrier: string | null;
          bandeirasCielo: string | null;
        }[]
      >(Prisma.sql`
        SELECT
          r.id,
          r.adquirente,
          r.dataRecebimento,
          r.valorEsperado,
          r.valorRecebido,
          r.diferenca,
          r.status,
          r.movimentoTrierId,
          r.filialId,
          (SELECT COUNT(*) FROM TrierParcela tp WHERE tp.receivableId = r.id) AS nTrier,
          (SELECT COUNT(*) FROM RedeParcela rp WHERE rp.receivableId = r.id) AS nRede,
          (SELECT COUNT(*) FROM CieloParcela cp WHERE cp.receivableId = r.id) AS nCielo,
          (SELECT GROUP_CONCAT(DISTINCT tp2.bandeira)
             FROM TrierParcela tp2
             WHERE tp2.receivableId = r.id AND tp2.bandeira IS NOT NULL AND tp2.bandeira <> '') AS bandeirasTrier,
          (SELECT GROUP_CONCAT(DISTINCT cp2.bandeira)
             FROM CieloParcela cp2
             WHERE cp2.receivableId = r.id AND cp2.bandeira IS NOT NULL AND cp2.bandeira <> '') AS bandeirasCielo
        FROM Receivable r
        ${pendenteWhere}
        ORDER BY r.dataRecebimento ASC, r.id ASC
        LIMIT 500
      `),
      this.prisma.$queryRaw<{ total: any; valorSaldo: any }[]>(Prisma.sql`
        SELECT COUNT(*) AS total,
               COALESCE(
                 SUM(r.valorEsperado - COALESCE(r.valorRecebido, 0)),
                 0
               ) AS valorSaldo
        FROM Receivable r
        ${pendenteWhere}
      `),
    ]);

    const items = rows.map((r) => {
      const nTrier = Number(r.nTrier || 0);
      const nRede = Number(r.nRede || 0);
      const nCielo = Number(r.nCielo || 0);
      const origens: string[] = [];
      if (nTrier > 0) origens.push('TRIER');
      if (nRede > 0) origens.push('REDE');
      if (nCielo > 0) origens.push('CIELO');

      const bandeirasSet = new Set<string>();
      (r.bandeirasTrier ?? '')
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean)
        .forEach((b) => bandeirasSet.add(b));
      (r.bandeirasCielo ?? '')
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean)
        .forEach((b) => bandeirasSet.add(b));

      return {
        id: Number(r.id),
        adquirente: r.adquirente,
        dataRecebimento: r.dataRecebimento,
        valorEsperado: Number(r.valorEsperado || 0),
        valorRecebido: r.valorRecebido == null ? null : Number(r.valorRecebido),
        diferenca: r.diferenca == null ? null : Number(r.diferenca),
        saldo:
          Math.round(
            (Number(r.valorEsperado || 0) - Number(r.valorRecebido || 0)) * 100,
          ) / 100,
        status: r.status,
        movimentoTrierId: r.movimentoTrierId,
        filialId: Number(r.filialId),
        nParcelas: nTrier + nRede + nCielo,
        origens,
        bandeiras: [...bandeirasSet].sort(),
      };
    });

    return {
      total: Number(aggr[0]?.total || 0),
      valorSaldo: Number(aggr[0]?.valorSaldo || 0),
      items,
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
