import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/database/prisma.service';
import { ConciliacaoTimeHelper } from '../helpers/conciliacao-time.service';

@Injectable()
export class ConciliacaoDashboardService {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject()
  private readonly timeHelper: ConciliacaoTimeHelper;

  async totaisDias(filialId: number, dateRange: { from: string; to: string }) {
    const start = new Date(dateRange.from + 'T00:00:00.000Z');
    const end = new Date(dateRange.to + 'T00:00:00.000Z');

    const totais = await this.prisma.conciliacaoItem.groupBy({
      by: ['dataReferencia', 'origem'],
      where: {
        dataReferencia: {
          gte: start,
          lte: end,
        },
        grupo: { conciliacao: { filialId } },
      },

      _sum: { valor: true },
    });

    const divergencias = await this.prisma.$queryRaw<
      { dia: string; total: number }[]
    >`
        SELECT 
        dia,
        SUM(valorFinal) as total
      FROM (
        SELECT 
          cg.id,
          DATE(ci.dataReferencia) as dia,
          cg.valorFinal
        FROM conciliacaoGrupo cg
        JOIN conciliacaoItem ci ON ci.grupoId = cg.id
        JOIN conciliacao c ON c.id = cg.conciliacaoId
        WHERE c.filialId = ${filialId}
          AND cg.status <> 'CONCILIADO'
          AND ci.dataReferencia BETWEEN ${start} AND ${end}
        GROUP BY cg.id, dia, cg.valorFinal
      ) t
      GROUP BY dia;
  `;

    const resultado: Record<string, any> = {};

    // totais por origem
    for (const item of totais) {
      const dia = new Date(item.dataReferencia).toISOString().slice(0, 10);

      const origem = item.origem;
      const valor = Number(item._sum.valor ?? 0);

      if (!resultado[dia]) {
        resultado[dia] = {
          data: dia,
          totalDivergencia: 0,
        };
      }

      if (!resultado[dia][origem]) {
        resultado[dia][origem] = 0;
      }

      resultado[dia][origem] += valor;
    }

    // divergências
    for (const div of divergencias) {
      const dia = new Date(div.dia).toISOString().slice(0, 10);

      if (!resultado[dia]) {
        resultado[dia] = {
          data: dia,
        };
      }

      resultado[dia].totalDivergencia = Number(div.total) || 0;
    }

    return Object.values(resultado).sort((a: any, b: any) => {
      return new Date(b.data).getTime() - new Date(a.data).getTime();
    });
  }

  async totaisCards(
    dateRange: { from: string; to: string },
    filialId?: number,
  ) {
    const start = new Date(dateRange.from + 'T00:00:00.000Z');
    const end = new Date(dateRange.to + 'T00:00:00.000Z');
    const totais = await this.prisma.$transaction(async (ctx) => {
      let filialCielo;
      if (filialId) {
        filialCielo = await ctx.filial.findUnique({
          where: { id: filialId },
        });
      }
      const naoConciliados = await ctx.conciliacaoGrupo.aggregate({
        where: {
          status: 'DIVERGENTE',

          conciliacao: {
            ...(filialId && { filialId }),
          },
          itens: {
            some: {
              dataReferencia: {
                gte: start,
                lte: end,
              },
            },
          },
        },
        _sum: {
          valorFinal: true,
        },
      });
      const conciliadosTrier = await ctx.trierCartaoVendas.aggregate({
        where: {
          ...(filialId && { filialId }),
          statusConciliacao: 'CONCILIADO',
          dataEmissao: { gte: new Date(start), lte: new Date(end) },
        },
        _sum: {
          valor: true,
        },
      });

      const trier = await ctx.trierCartaoVendas.aggregate({
        where: {
          ...(filialId && { filialId }),
          dataEmissao: {
            gte: new Date(start),
            lte: new Date(end),
          },
          bandeira: { not: { contains: 'BRASILCARD' } },
        },
        _sum: { valor: true },
      });
      const kpiConciTrier = conciliadosTrier._sum.valor
        ? conciliadosTrier._sum.valor
            .div(trier._sum.valor)
            .mul(100)
            .toDecimalPlaces(2)
        : 0;

      const rede = await ctx.redeVenda.aggregate({
        where: {
          ...(filialId && { filialId }),
          dataVenda: {
            gte: new Date(start),
            lte: new Date(end),
          },
        },
        _sum: { valor: true },
      });
      // const cielo = await ctx.cartaoVendas.aggregate({
      //   where: {
      //     ...(filialId && { estabelecimento: filialCielo.idCielo }),
      //     dataVenda: {
      //       gte: dateRange.from,
      //       lte: dateRange.to,
      //     },
      //   },
      //   _sum: { valorBruto: true },
      // });

      const cielo = await this.prisma.conciliacaoItem.aggregate({
        where: {
          origem: 'CIELO',
          dataReferencia: {
            gte: start,
            lte: end,
          },

          ...(filialId && { grupo: { conciliacao: { filialId } } }),
        },

        _sum: { valor: true },
      });

      const totalAdq = (rede._sum.valor || new Decimal(0)).plus(
        cielo._sum.valor || new Decimal(0),
      );
      const diferenca =
        !trier._sum.valor || trier._sum.valor.sub(totalAdq).abs().lessThan(0.01)
          ? new Decimal(0)
          : trier._sum.valor.sub(totalAdq).toDecimalPlaces(2);

      return {
        erp: trier._sum.valor ? trier._sum.valor.toDecimalPlaces(2) : 0,
        adquirentes: totalAdq ? totalAdq.toDecimalPlaces(2) : 0,
        diferenca: diferenca || 0,
        naoConciliados: (
          naoConciliados._sum.valorFinal || new Decimal(0)
        ).toDecimalPlaces(2),
        kpiConciTrier,
      };
    });
    return totais;
  }

  async chartLinesCards(
    dateRange: { from: string; to: string },
    filialId?: number,
  ) {
    const start = new Date(dateRange.from + 'T00:00:00.000Z');
    const end = new Date(dateRange.to + 'T00:00:00.000Z');

    let filial = null;

    // 🔹 Busca filial somente se informado
    if (filialId) {
      filial = await this.prisma.filial.findUnique({
        where: { id: filialId },
      });

      if (!filial) {
        throw new BadRequestException('Filial não encontrada');
      }
    }
    const filtroFilial = filialId
      ? Prisma.sql`AND c.filialId = ${filialId}`
      : Prisma.empty;

    // 🔹 TRIER
    const trier = await this.prisma.trierCartaoVendas.groupBy({
      by: ['dataEmissao'],
      where: {
        ...(filialId && { filialId }),
        dataEmissao: {
          gte: start,
          lte: end,
        },
      },
      _sum: {
        valor: true,
      },
    });

    // 🔹 REDE
    const rede = await this.prisma.redeVenda.groupBy({
      by: ['dataVenda'],
      where: {
        ...(filialId && { filialId }),
        dataVenda: {
          gte: start,
          lte: end,
        },
      },
      _sum: {
        valor: true,
      },
    });

    // 🔹 CIELO
    // const cielo = await this.prisma.cartaoVendas.groupBy({
    //   by: ['dataVenda'],
    //   where: {
    //     ...(filial?.idCielo && {
    //       estabelecimento: filial.idCielo,
    //     }),
    //     dataVenda: {
    //       gte: dateRange.from,
    //       lte: dateRange.to,
    //     },
    //   },
    //   _sum: {
    //     valorBruto: true,
    //   },
    // });

    const cielo = await this.prisma.conciliacaoItem.groupBy({
      by: ['dataReferencia'],
      where: {
        origem: 'CIELO',
        dataReferencia: {
          gte: start,
          lte: end,
        },
        ...(filialId && { grupo: { conciliacao: { filialId } } }),
      },

      _sum: { valor: true },
    });

    // 🔹 DIVERGÊNCIAS
    const divergencias = await this.prisma.$queryRaw<
      { dia: string; total: number }[]
    >(Prisma.sql`
    SELECT
      dia,
      SUM(valorFinal) as total
    FROM (
      SELECT
        cg.id,
        DATE(ci.dataReferencia) as dia,
        cg.valorFinal
      FROM conciliacaoGrupo cg
      JOIN conciliacaoItem ci ON ci.grupoId = cg.id
      JOIN conciliacao c ON c.id = cg.conciliacaoId
      WHERE
        cg.status <> 'CONCILIADO'
        ${filtroFilial}
        AND ci.dataReferencia BETWEEN ${start} AND ${end}
      GROUP BY cg.id, dia, cg.valorFinal
    ) t
    GROUP BY dia
  `);
    const resultado: Record<string, any> = {};

    // 🔹 Trier
    for (const item of trier) {
      const dia = new Date(item.dataEmissao).toISOString().slice(0, 10);

      if (!resultado[dia]) {
        resultado[dia] = {
          data: dia,
          trier: 0,
          adquirentes: 0,
          diferenca: 0,
        };
      }

      resultado[dia].trier += Number(item._sum.valor || 0);
    }

    // 🔹 Rede
    for (const item of rede) {
      const dia = new Date(item.dataVenda).toISOString().slice(0, 10);

      if (!resultado[dia]) {
        resultado[dia] = {
          data: dia,
          trier: 0,
          adquirentes: 0,
          diferenca: 0,
        };
      }

      resultado[dia].adquirentes += Number(item._sum.valor || 0);
    }

    // 🔹 Cielo
    for (const item of cielo) {
      const dia = new Date(item.dataReferencia).toISOString().slice(0, 10);

      if (!resultado[dia]) {
        resultado[dia] = {
          data: dia,
          trier: 0,
          adquirentes: 0,
          diferenca: 0,
        };
      }

      resultado[dia].adquirentes += Number(item._sum.valor || 0);
    }

    // 🔹 Divergências
    for (const item of divergencias) {
      const dia = new Date(item.dia).toISOString().slice(0, 10);

      if (!resultado[dia]) {
        resultado[dia] = {
          data: dia,
          trier: 0,
          adquirentes: 0,
          diferenca: 0,
        };
      }

      resultado[dia].diferenca = Number(item.total || 0) * -1;
    }

    return Object.values(resultado).sort(
      (a: any, b: any) =>
        new Date(a.data).getTime() - new Date(b.data).getTime(),
    );
  }

  async chartRankingPendencias(dateRange: { from: string; to: string }) {
    const start = new Date(dateRange.from + 'T00:00:00.000Z');
    const end = new Date(dateRange.to + 'T23:59:59.999Z');

    const rankingNaoConciliados = await this.prisma.$queryRaw<
      {
        filial: string;
        filialId: number;
        divergencias: bigint;
        valor: any;
      }[]
    >`
  SELECT
    f.name AS filial,
    f.id AS filialId,
    CAST(COUNT(cg.id) AS SIGNED) AS divergencias,
    SUM(COALESCE(cg.valorFinal, 0)) AS valor
  FROM ConciliacaoGrupo cg
  INNER JOIN Conciliacao c
    ON c.id = cg.conciliacaoId
  INNER JOIN Filial f
    ON f.id = c.filialId
  WHERE
    cg.status = 'DIVERGENTE'
    AND EXISTS (
      SELECT 1
      FROM ConciliacaoItem ci
      WHERE ci.grupoId = cg.id
        AND ci.dataReferencia BETWEEN ${start} AND ${end}
    )
  GROUP BY
    f.id,
    f.name
  ORDER BY
    valor DESC
  `;

    return rankingNaoConciliados.map((item) => ({
      filial: item.filial,
      filialId: item.filialId,
      divergencias: Number(item.divergencias),
      valor: Number(item.valor),
    }));
  }

  async chartRankingHealth(
    dateRange: { from: string; to: string },
    filialId?: number,
  ) {
    const start = new Date(`${dateRange.from}T00:00:00.000Z`);
    const end = new Date(`${dateRange.to}T23:59:59.999Z`);

    const [gruposConciliados, totalDivergentes] = await Promise.all([
      this.prisma.conciliacaoGrupo.findMany({
        where: {
          status: 'CONCILIADO',
          conciliacao: {
            ...(filialId && { filialId }),
          },
          itens: {
            some: {
              dataReferencia: {
                gte: start,
                lte: end,
              },
            },
          },
        },
        include: {
          itens: {
            include: {
              trier: true,
              rede: true,
              cielo: true,
            },
          },
        },
      }),

      this.prisma.conciliacaoGrupo.count({
        where: {
          status: 'DIVERGENTE',
          conciliacao: {
            ...(filialId && { filialId }),
          },
          itens: {
            some: {
              dataReferencia: {
                gte: start,
                lte: end,
              },
            },
          },
        },
      }),
    ]);

    let automatico = 0;
    let manualMenor2 = 0;
    let manualMaior2 = 0;
    let unico = 0;

    for (const grupo of gruposConciliados) {
      const itensConciliaveis = grupo.itens.filter(
        (item) =>
          item.origem === 'TRIER' ||
          item.origem === 'REDE' ||
          item.origem === 'CIELO',
      );

      const quantidadeTrier = itensConciliaveis.filter(
        (item) => item.origem === 'TRIER',
      ).length;

      const quantidadeAdquirente = itensConciliaveis.filter(
        (item) => item.origem === 'REDE' || item.origem === 'CIELO',
      ).length;

      const possuiTrier = quantidadeTrier > 0;
      const possuiAdquirente = quantidadeAdquirente > 0;

      // 🔹 Único somente quando existir um único movimento
      const ehUnico =
        possuiTrier !== possuiAdquirente && itensConciliaveis.length === 1;

      if (ehUnico) {
        const possuiBrasilCard = grupo.itens.some((item) => {
          const bandeiras = [
            item.trier?.bandeira,
            item.rede?.bandeira,
            item.cielo?.bandeira,
          ]
            .filter(Boolean)
            .join(' ')
            .toUpperCase();

          return bandeiras.includes('BRASILCARD');
        });

        if (!possuiBrasilCard) {
          unico++;
        }

        continue;
      }

      // 🔹 Automático
      if (grupo.metodo === 'AUTO') {
        automatico++;
        continue;
      }

      // 🔹 Manual
      if (grupo.metodo === 'MANUAL') {
        const diferenca = Number(grupo.valorFinal ?? 0);

        if (diferenca >= -2 && diferenca <= 2) {
          manualMenor2++;
        } else {
          manualMaior2++;
        }
      }
    }

    const totalConciliados = automatico + manualMenor2 + manualMaior2 + unico;

    const totalGrupos = totalConciliados + totalDivergentes;
    const percentualAutomaticoGeral =
      totalGrupos === 0
        ? 0
        : Number(((automatico / totalGrupos) * 100).toFixed(2));

    const percentualManualGeral =
      totalGrupos === 0
        ? 0
        : Number(
            (((manualMenor2 + manualMaior2) / totalGrupos) * 100).toFixed(2),
          );

    const percentualUnicoGeral =
      totalGrupos === 0 ? 0 : Number(((unico / totalGrupos) * 100).toFixed(2));
    const percentualConciliado = (valor: number) =>
      totalConciliados === 0
        ? 0
        : Number(((valor / totalConciliados) * 100).toFixed(2));

    const percentualGeral = (valor: number) =>
      totalGrupos === 0 ? 0 : Number(((valor / totalGrupos) * 100).toFixed(2));

    return {
      resumo: {
        totalGrupos,
        totalConciliados,
        totalDivergentes,

        percentualConciliado: percentualGeral(totalConciliados),

        percentualDivergente: percentualGeral(totalDivergentes),

        percentualAutomaticoGeral,

        percentualManualGeral,

        percentualUnicoGeral,
      },

      ranking: [
        {
          tipo: 'Automático',
          quantidade: automatico,
          percentual: percentualConciliado(automatico),
        },

        {
          tipo: 'Manual ± R$2',
          quantidade: manualMenor2,
          percentual: percentualConciliado(manualMenor2),
        },

        {
          tipo: 'Manual > R$2',
          quantidade: manualMaior2,
          percentual: percentualConciliado(manualMaior2),
        },

        {
          tipo: 'Único',
          quantidade: unico,
          percentual: percentualConciliado(unico),
        },
      ],
    };
  }

  async findMovimentosByHealthType(
    dateRange: { from: string; to: string },
    type:
      | 'AUTOMATICO'
      | 'MANUAL_MENOR_2'
      | 'MANUAL_MAIOR_2'
      | 'UNICO'
      | 'DIVERGENTE',
    filialId?: number,
  ) {
    if (!type) return [];
    const start = new Date(`${dateRange.from}T00:00:00.000Z`);
    const end = new Date(`${dateRange.to}T23:59:59.999Z`);

    const grupos = await this.prisma.conciliacaoGrupo.findMany({
      where: {
        ...(type === 'DIVERGENTE'
          ? { status: 'DIVERGENTE' }
          : { status: 'CONCILIADO' }),

        conciliacao: {
          ...(filialId && { filialId }),
        },

        itens: {
          some: {
            dataReferencia: {
              gte: start,
              lte: end,
            },
          },
        },
      },
      include: {
        conciliacao: true,
        itens: {
          include: {
            trier: true,
            rede: true,
            cielo: true,
          },
        },
      },
    });

    const gruposFiltrados = grupos.filter((grupo) => {
      const itensConciliaveis = grupo.itens.filter(
        (item) =>
          item.origem === 'TRIER' ||
          item.origem === 'REDE' ||
          item.origem === 'CIELO',
      );

      const quantidadeTrier = itensConciliaveis.filter(
        (item) => item.origem === 'TRIER',
      ).length;

      const quantidadeAdquirente = itensConciliaveis.filter(
        (item) => item.origem === 'REDE' || item.origem === 'CIELO',
      ).length;

      const possuiTrier = quantidadeTrier > 0;
      const possuiAdquirente = quantidadeAdquirente > 0;

      const ehUnico =
        possuiTrier !== possuiAdquirente && itensConciliaveis.length === 1;

      const possuiBrasilCard = grupo.itens.some((item) => {
        const bandeiras = [
          item.trier?.bandeira,
          item.rede?.bandeira,
          item.cielo?.bandeira,
        ]
          .filter(Boolean)
          .join(' ')
          .toUpperCase();

        return bandeiras.includes('BRASILCARD');
      });

      switch (type) {
        case 'DIVERGENTE':
          return true;

        case 'UNICO':
          return ehUnico && !possuiBrasilCard;

        case 'AUTOMATICO':
          return !ehUnico && grupo.metodo === 'AUTO';

        case 'MANUAL_MENOR_2': {
          const diferenca = Number(grupo.valorFinal ?? 0);

          return (
            !ehUnico &&
            grupo.metodo === 'MANUAL' &&
            diferenca >= -2 &&
            diferenca <= 2
          );
        }

        case 'MANUAL_MAIOR_2': {
          const diferenca = Number(grupo.valorFinal ?? 0);

          return (
            !ehUnico &&
            grupo.metodo === 'MANUAL' &&
            (diferenca < -2 || diferenca > 2)
          );
        }

        default:
          return false;
      }
    });

    const grupoIds = gruposFiltrados.map((grupo) => grupo.id);

    const conciliacaoItem = await this.prisma.conciliacaoItem.findMany({
      where: {
        grupoId: {
          in: grupoIds,
        },
      },
      include: {
        grupo: true,
        cielo: true,
        rede: true,
        trier: true,
      },
    });

    const itens = conciliacaoItem.map((item) => ({
      item,
      conciliacaoId: item.grupo.conciliacaoId,
      horaNum: this.timeHelper.getHoraNormalizada(item),
      horaFmt: this.timeHelper.getHoraFormatada(item),
      data: item.dataReferencia,
    }));

    const resultado = [];

    for (const entry of itens) {
      const { item, horaFmt, horaNum, conciliacaoId, data } = entry;

      if (item.origem === 'TRIER') {
        resultado.push({
          id: item.id,
          grupoId: item.grupoId,
          valorFinal: item.grupo.valorFinal,
          conciliacaoId,
          horaNum,
          hora: horaFmt,
          valor: item.valor.toFixed(2),
          documentoFiscal: item.trier?.documentoFiscal,
          modalidade: item.trier?.modalidade,
          bandeira: item.trier?.bandeira,
          status: item.trier?.statusConciliacao,
          motivo: item.grupo.motivo,
          origem: item.origem,
          data,
        });
      } else if (item.origem === 'CIELO' && item.cielo) {
        resultado.push({
          id: item.id,
          grupoId: item.grupoId,
          conciliacaoId,
          valorFinal: item.grupo.valorFinal,
          data,
          horaNum,
          hora: horaFmt,
          origem: item.origem,
          valor: item.valor.toFixed(2),
          nsu: item.cielo.nsu,
          bandeira: item.cielo.bandeira,
          modalidade: item.cielo.modalidade,
          status: item.cielo.statusConciliacao,
          motivo: item.grupo.motivo,
        });
      } else if (item.origem === 'REDE' && item.rede) {
        resultado.push({
          id: item.id,
          grupoId: item.grupoId,
          valorFinal: item.grupo.valorFinal,
          conciliacaoId,
          data,
          horaNum,
          hora: horaFmt,
          origem: item.origem,
          valor: item.valor.toFixed(2),
          nsu: item.rede.nsu,
          bandeira: item.rede.bandeira,
          modalidade: item.rede.modalidade,
          status: item.rede.statusConciliacao,
          motivo: item.grupo.motivo,
        });
      }
    }

    resultado.sort((a, b) => a.horaNum - b.horaNum);

    const gruposMap = new Map();

    for (const item of resultado) {
      if (!gruposMap.has(item.grupoId)) {
        gruposMap.set(item.grupoId, {
          grupoId: item.grupoId,
          conciliacaoId: item.conciliacaoId,
          motivo: item.motivo,
          valorFinal: item.valorFinal,

          registros: [],
        });
      }
      const { grupoId, conciliacaoId, motivo, valorFinal, ...registro } = item;

      gruposMap.get(grupoId).registros.push(registro);
    }

    return Array.from(gruposMap.values());
  }
}
