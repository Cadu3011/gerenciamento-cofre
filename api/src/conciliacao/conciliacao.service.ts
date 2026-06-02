import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateConciliacaoDto } from './dto/create-conciliacao.dto';
import { PrismaService } from 'src/database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma, StatusConciliacao } from '@prisma/client';

@Injectable()
export class ConciliacaoService {
  @Inject()
  private readonly prisma: PrismaService;

  create(createConciliacaoDto: CreateConciliacaoDto) {
    return '';
  }

  private getHoraNormalizada(item) {
    let hora =
      item.trier?.hora || item.rede?.horaVenda || item.cielo?.timeVenda;

    if (!hora) return 0;

    // 🟡 Caso seja Date (UTC vindo do banco)
    if (hora instanceof Date) {
      const data = new Date(hora);

      // ajusta UTC → Brasil (-3h)

      const h = data.getHours().toString().padStart(2, '0');
      const m = data.getMinutes().toString().padStart(2, '0');
      const s = data.getSeconds().toString().padStart(2, '0');

      return Number(`${h}${m}${s}`);
    }

    // 🟡 Caso seja string
    if (typeof hora === 'string') {
      // remove ":"
      let normalizada = hora.replace(/:/g, '');

      // se for UTC (trier/rede), ajusta -3h manualmente
      if (item.trier || item.rede) {
        const h = Number(normalizada.slice(0, 2));
        const m = normalizada.slice(2, 4);
        const s = normalizada.slice(4, 6);

        let horaAjustada = h - 3;
        if (horaAjustada < 0) horaAjustada += 24;

        return Number(`${horaAjustada.toString().padStart(2, '0')}${m}${s}`);
      }
      return Number(normalizada);
    }

    return 0;
  }
  private getHoraFormatada(item) {
    const horaRaw =
      item.trier?.hora || item.rede?.horaVenda || item.cielo?.timeVenda;

    if (!horaRaw) return null;

    // 🟡 CASO CIELO (HHMMSS)
    if (item.cielo?.timeVenda) {
      const hora = horaRaw.toString().trim();

      if (hora.length === 6) {
        const h = hora.slice(0, 2);
        const m = hora.slice(2, 4);
        const s = hora.slice(4, 6);

        return `${h}:${m}:${s}`;
      }
    }

    // 🟡 CASO DATE (TRIER / REDE - UTC)
    if (horaRaw instanceof Date || typeof horaRaw === 'string') {
      const data = new Date(horaRaw);

      const h = data.getHours().toString().padStart(2, '0');
      const m = data.getMinutes().toString().padStart(2, '0');
      const s = data.getSeconds().toString().padStart(2, '0');

      return `${h}:${m}:${s}`;
    }

    return null;
  }

  async findByDate(filialId: number, date: string) {
    const conciliacaoItem = await this.prisma.conciliacaoItem.findMany({
      where: {
        grupo: {
          conciliacao: {
            filialId,
          },
        },
        dataReferencia: new Date(`${date}T00:00:00.000Z`),
      },
      include: {
        grupo: { include: { _count: { select: { itens: true } } } },
        cielo: true,
        rede: true,
        trier: true,
      },
    });

    // 🔹 já normaliza tudo uma vez só
    const itens = conciliacaoItem.map((item) => ({
      item,
      conciliacaoId: item.grupo.conciliacaoId,
      cieloValue: item.grupo.valorCielo,
      horaNum: this.getHoraNormalizada(item),
      horaFmt: this.getHoraFormatada(item),
      metodo: item.grupo.metodo,
      qtdItensGrupo: item.grupo._count,
    }));

    // 🔹 TRIER
    const trier = itens
      .filter(({ item }) => item.origem === 'TRIER')
      .sort((a, b) => a.horaNum - b.horaNum)
      .map(({ item, horaFmt, metodo, qtdItensGrupo }) => ({
        id: item.id,
        grupoId: item.grupoId,
        valor: item.valor,
        hora: horaFmt,
        documentoFiscal: item.trier?.documentoFiscal,
        modalidade: item.trier?.modalidade,
        bandeira: item.trier?.bandeira,
        status: item.trier?.statusConciliacao,
        origem: item.origem,
        metodo,
        qtdItensGrupo,
      }));

    // 🔹 OUTROS (já ordena antes de qualquer agrupamento)
    const outrosBase = itens
      .filter(({ item }) => ['CIELO', 'REDE'].includes(item.origem))
      .sort((a, b) => a.horaNum - b.horaNum);

    // 🔹 deduplicação cielo
    const cieloMap = new Map();
    const outros = [];

    for (const entry of outrosBase) {
      const { item, cieloValue, horaFmt, horaNum, metodo, qtdItensGrupo } =
        entry;

      if (item.origem === 'CIELO' && item.cielo) {
        const isPix = item.cielo.modalidade === 'Pix';

        if (isPix) {
          // 🔥 PIX nunca deduplica
          outros.push({
            id: item.id,
            grupoId: item.grupoId,
            horaNum,
            hora: horaFmt,
            origem: item.origem,
            valor: cieloValue,
            nsu: item.cielo.nsu,
            bandeira: item.cielo.bandeira,
            modalidade: item.cielo.modalidade,
            status: item.cielo.statusConciliacao,
            metodo,
            qtdItensGrupo,
          });
        } else {
          const key = item.cielo.nsu;
          if (!cieloMap.has(key)) {
            cieloMap.set(key, true);
            outros.push({
              id: item.id,
              grupoId: item.grupoId,
              horaNum,
              hora: horaFmt,
              origem: item.origem,
              valor: cieloValue,
              nsu: item.cielo.nsu,
              bandeira: item.cielo.bandeira,
              modalidade: item.cielo.modalidade,
              status: item.cielo.statusConciliacao,
              metodo,
              qtdItensGrupo,
            });
          }
        }
      } else if (item.origem === 'REDE') {
        outros.push({
          id: item.id,
          grupoId: item.grupoId,
          horaNum,
          hora: horaFmt,
          origem: item.origem,
          valor: item.valor,
          nsu: item.rede.nsu,
          bandeira: item.rede.bandeira,
          modalidade: item.rede.modalidade,
          status: item.rede.statusConciliacao,
          metodo,
          qtdItensGrupo,
        });
      }
    }

    return {
      trier,
      outros,
    };
  }

  async reconcile(data: CreateConciliacaoDto) {
    if (data.groupIds.length === 1 && !data.motivo)
      throw new BadRequestException('Deve conter um motivo ou observação');

    return this.prisma.$transaction(async (tx) => {
      // 1️⃣ Buscar grupos com itens
      const groups = await tx.conciliacaoGrupo.findMany({
        where: { id: { in: data.groupIds } },
        include: {
          itens: true,
          conciliacao: true,
        },
      });
      const conciliacao = await tx.conciliacao.findUnique({
        where: {
          id: data.conciliacaoId,
        },
      });

      if (data.filialId != conciliacao.filialId)
        throw new Error('ID de Conciliação não bate com filial de origem');

      if (!groups.length) throw new Error('Grupos não encontrados');

      // 3️⃣ Junta todos os itens
      const itens = groups.flatMap((g) => g.itens);

      // 4️⃣ Calcula valores
      let valorTrier = new Decimal(0);
      let valorRede = new Decimal(0);
      let valorCielo = new Decimal(0);

      for (const item of itens) {
        if (item.origem === 'TRIER') valorTrier = valorTrier.plus(item.valor);
        if (item.origem === 'REDE') valorRede = valorRede.plus(item.valor);
        if (item.origem === 'CIELO') valorCielo = valorCielo.plus(item.valor);
      }

      const valorFinal = valorTrier.sub(valorRede.plus(valorCielo));

      // 5️⃣ Cria novo grupo
      const newGroup = await tx.conciliacaoGrupo.create({
        data: {
          conciliacaoId: data.conciliacaoId,
          metodo: 'MANUAL',
          status: 'CONCILIADO',
          valorTrier,
          valorRede,
          valorCielo,
          valorFinal,
          idempotencyKey: `MANUAL-${data.groupIds.sort().join('-')}-${Date.now()}`,
          ...(data.motivo && { motivo: data.motivo }),
        },
      });

      // 6️⃣ Move itens
      for (const item of itens) {
        await tx.conciliacaoItem.update({
          where: { id: item.id },
          data: {
            grupoId: newGroup.id,
            origemGrupoId: item.origemGrupoId ?? item.grupoId,
          },
        });
      }

      // 7️⃣ Atualiza status na origem
      const trierIds = itens.map((i) => i.trierId).filter(Boolean);
      const redeIds = itens.map((i) => i.redeId).filter(Boolean);
      const cieloIds = itens.map((i) => i.cieloId).filter(Boolean);

      if (trierIds.length) {
        await tx.trierCartaoVendas.updateMany({
          where: { id: { in: trierIds } },
          data: { statusConciliacao: 'CONCILIADO' },
        });
      }

      if (redeIds.length) {
        await tx.redeVenda.updateMany({
          where: { id: { in: redeIds } },
          data: { statusConciliacao: 'CONCILIADO' },
        });
      }

      if (cieloIds.length) {
        await tx.cartaoVendas.updateMany({
          where: { id: { in: cieloIds } },
          data: { statusConciliacao: 'CONCILIADO' },
        });
      }

      // 8️⃣ Marca grupos antigos como CANCELADO
      await tx.conciliacaoGrupo.updateMany({
        where: { id: { in: data.groupIds } },
        data: {
          status: 'CANCELADO',
          migradoDeGrupoId: newGroup.id,
        },
      });

      return newGroup;
    });
  }

  async disagreement(grupoId: number, filialId: number) {
    if (!grupoId) throw new BadRequestException('ID de Grupo Ausente');

    return this.prisma.$transaction(async (tx) => {
      // 1️⃣ Buscar grupo conciliado
      const grupo = await tx.conciliacaoGrupo.findUnique({
        where: { id: grupoId },
        include: {
          itens: true,
          conciliacao: true,
        },
      });

      if (!grupo) throw new BadRequestException('Grupo não encontrado');

      if (grupo.status !== 'CONCILIADO') {
        throw new BadRequestException('Grupo não está conciliado');
      }

      if (grupo.conciliacao.filialId !== filialId) {
        throw new BadRequestException('Filial inválida');
      }

      // 2️⃣ Buscar grupos originais
      const gruposOriginais = await tx.conciliacaoGrupo.findMany({
        where: {
          migradoDeGrupoId: grupo.id,
        },
      });

      if (!gruposOriginais.length) {
        throw new BadRequestException('Grupos de origem não encontrados');
      }

      // 3️⃣ Mapear grupos por ID
      const gruposMap = new Map(gruposOriginais.map((g) => [g.id, g]));

      // 4️⃣ Voltar itens para origem
      for (const item of grupo.itens) {
        const grupoDestinoId = item.origemGrupoId;

        if (!grupoDestinoId || !gruposMap.has(grupoDestinoId)) {
          throw new BadRequestException(`Item ${item.id} sem origem válida`);
        }

        await tx.conciliacaoItem.update({
          where: { id: item.id },
          data: {
            grupoId: grupoDestinoId,
          },
        });
      }

      // 5️⃣ Reativar grupos originais
      await tx.conciliacaoGrupo.updateMany({
        where: {
          id: { in: gruposOriginais.map((g) => g.id) },
        },
        data: {
          status: 'DIVERGENTE',
        },
      });

      // 6️⃣ Cancelar grupo conciliado
      await tx.conciliacaoGrupo.update({
        where: { id: grupo.id },
        data: {
          status: 'CANCELADO',
        },
      });

      // 7️⃣ Atualizar status das entidades externas
      const trierIds = grupo.itens.map((i) => i.trierId).filter(Boolean);
      const redeIds = grupo.itens.map((i) => i.redeId).filter(Boolean);
      const cieloIds = grupo.itens.map((i) => i.cieloId).filter(Boolean);

      if (trierIds.length) {
        await tx.trierCartaoVendas.updateMany({
          where: { id: { in: trierIds } },
          data: { statusConciliacao: 'DIVERGENTE' },
        });
      }

      if (redeIds.length) {
        await tx.redeVenda.updateMany({
          where: { id: { in: redeIds } },
          data: { statusConciliacao: 'DIVERGENTE' },
        });
      }

      if (cieloIds.length) {
        await tx.cartaoVendas.updateMany({
          where: { id: { in: cieloIds } },
          data: { statusConciliacao: 'DIVERGENTE' },
        });
      }

      return { success: true };
    });
  }

  async findByDateDivergentes(filialId: number, date: string) {
    const conciliacaoItem = await this.prisma.conciliacaoItem.findMany({
      where: {
        grupo: {
          conciliacao: {
            filialId,
          },
          status: 'DIVERGENTE',
        },
        dataReferencia: new Date(`${date}T00:00:00.000Z`),
      },
      include: {
        grupo: true,
        cielo: true,
        rede: true,
        trier: true,
      },
    });

    // 🔹 já normaliza tudo uma vez só
    const itens = conciliacaoItem.map((item) => ({
      item,
      conciliacaoId: item.grupo.conciliacaoId,
      cieloValue: item.grupo.valorCielo,
      horaNum: this.getHoraNormalizada(item),
      horaFmt: this.getHoraFormatada(item),
    }));

    const cieloMap = new Map();
    const resultado = [];

    for (const entry of itens) {
      const { item, cieloValue, horaFmt, horaNum, conciliacaoId } = entry;

      // 🔹 TRIER
      if (item.origem === 'TRIER') {
        resultado.push({
          id: item.id,
          grupoId: item.grupoId,
          conciliacaoId,
          horaNum,
          hora: horaFmt,
          valor: item.valor,
          documentoFiscal: item.trier?.documentoFiscal,
          modalidade: item.trier?.modalidade,
          bandeira: item.trier?.bandeira,
          status: item.trier?.statusConciliacao,
          origem: item.origem,
        });
      }

      // 🔹 CIELO
      else if (item.origem === 'CIELO' && item.cielo) {
        const isPix = item.cielo.modalidade === 'Pix';

        if (isPix) {
          resultado.push({
            id: item.id,
            grupoId: item.grupoId,
            conciliacaoId,
            horaNum,
            hora: horaFmt,
            origem: item.origem,
            valor: cieloValue,
            nsu: item.cielo.nsu,
            bandeira: item.cielo.bandeira,
            modalidade: item.cielo.modalidade,
            status: item.cielo.statusConciliacao,
          });
        } else {
          const key = item.cielo.nsu;

          if (!cieloMap.has(key)) {
            cieloMap.set(key, true);

            resultado.push({
              id: item.id,
              grupoId: item.grupoId,
              conciliacaoId,
              horaNum,
              hora: horaFmt,
              origem: item.origem,
              valor: cieloValue,
              nsu: item.cielo.nsu,
              bandeira: item.cielo.bandeira,
              modalidade: item.cielo.modalidade,
              status: item.cielo.statusConciliacao,
            });
          }
        }
      }

      // 🔹 REDE
      else if (item.origem === 'REDE') {
        resultado.push({
          id: item.id,
          grupoId: item.grupoId,
          conciliacaoId,
          horaNum,
          hora: horaFmt,
          origem: item.origem,
          valor: item.valor,
          nsu: item.rede.nsu,
          bandeira: item.rede.bandeira,
          modalidade: item.rede.modalidade,
          status: item.rede.statusConciliacao,
        });
      }
    }

    // 🔥 ORDENAÇÃO FINAL GLOBAL
    resultado.sort((a, b) => a.horaNum - b.horaNum);

    return resultado;
  }

  async findByDateConciliados(filialId: number, grupoId: number) {
    const conciliacaoItem = await this.prisma.conciliacaoItem.findMany({
      where: {
        grupo: {
          conciliacao: {
            filialId,
          },
          status: 'CONCILIADO',
          id: grupoId,
        },
      },
      include: {
        grupo: true,
        cielo: true,
        rede: true,
        trier: true,
      },
    });

    // 🔹 já normaliza tudo uma vez só
    const itens = conciliacaoItem.map((item) => ({
      item,
      conciliacaoId: item.grupo.conciliacaoId,
      cieloValue: item.grupo.valorCielo,
      horaNum: this.getHoraNormalizada(item),
      horaFmt: this.getHoraFormatada(item),
      valorFinal: item.grupo.valorFinal,
      motivo: item.grupo.motivo,
    }));

    const cieloMap = new Map();
    const resultado = [];

    for (const entry of itens) {
      const {
        item,
        cieloValue,
        horaFmt,
        horaNum,
        valorFinal,
        conciliacaoId,
        motivo,
      } = entry;

      // 🔹 TRIER
      if (item.origem === 'TRIER') {
        resultado.push({
          id: item.id,
          grupoId: item.grupoId,
          conciliacaoId,
          horaNum,
          hora: horaFmt,
          valor: item.valor,
          documentoFiscal: item.trier?.documentoFiscal,
          modalidade: item.trier?.modalidade,
          bandeira: item.trier?.bandeira,
          status: item.trier?.statusConciliacao,
          origem: item.origem,
          diferencaGrupo: valorFinal,
          motivo,
        });
      }

      // 🔹 CIELO
      else if (item.origem === 'CIELO' && item.cielo) {
        const isPix = item.cielo.modalidade === 'Pix';

        if (isPix) {
          resultado.push({
            id: item.id,
            grupoId: item.grupoId,
            conciliacaoId,
            horaNum,
            hora: horaFmt,
            origem: item.origem,
            valor: cieloValue,
            nsu: item.cielo.nsu,
            bandeira: item.cielo.bandeira,
            modalidade: item.cielo.modalidade,
            status: item.cielo.statusConciliacao,
            diferencaGrupo: valorFinal,
            motivo,
          });
        } else {
          const key = item.cielo.nsu;

          if (!cieloMap.has(key)) {
            cieloMap.set(key, true);

            resultado.push({
              id: item.id,
              grupoId: item.grupoId,
              conciliacaoId,
              horaNum,
              hora: horaFmt,
              origem: item.origem,
              valor: cieloValue,
              nsu: item.cielo.nsu,
              bandeira: item.cielo.bandeira,
              modalidade: item.cielo.modalidade,
              status: item.cielo.statusConciliacao,
              diferencaGrupo: valorFinal,
              motivo,
            });
          }
        }
      }

      // 🔹 REDE
      else if (item.origem === 'REDE') {
        resultado.push({
          id: item.id,
          grupoId: item.grupoId,
          conciliacaoId,
          horaNum,
          hora: horaFmt,
          origem: item.origem,
          valor: item.valor,
          nsu: item.rede.nsu,
          bandeira: item.rede.bandeira,
          modalidade: item.rede.modalidade,
          status: item.rede.statusConciliacao,
          diferencaGrupo: valorFinal,
          motivo,
        });
      }
    }

    // 🔥 ORDENAÇÃO FINAL GLOBAL
    resultado.sort((a, b) => a.horaNum - b.horaNum);

    return resultado;
  }

  async totalDiferencaDia(filialdId: number, date: string) {
    const conciliacaoDia = await this.prisma.conciliacao.findUnique({
      where: {
        filialId_startDate: {
          filialId: filialdId,
          startDate: new Date(`${date}T00:00:00.000Z`),
        },
      },
    });
    if (!conciliacaoDia) {
      return 0;
    }
    const total = await this.prisma.conciliacaoGrupo.aggregate({
      _sum: { valorFinal: true },
      where: {
        itens: { some: { dataReferencia: new Date(`${date}T00:00:00.000Z`) } },
        conciliacaoId: conciliacaoDia.id,
        status: { not: 'CONCILIADO' },
      },
    });
    return total._sum.valorFinal ?? 0;
  }

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
        divergencias: bigint;
        valor: any;
      }[]
    >`
SELECT
  f.name AS filial,
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
      divergencias: Number(item.divergencias),
      valor: Number(item.valor),
    }));
  }
}
