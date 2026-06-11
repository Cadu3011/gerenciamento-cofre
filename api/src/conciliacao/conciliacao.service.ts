import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateConciliacaoDto } from './dto/create-conciliacao.dto';
import { PrismaService } from 'src/database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { ConciliacaoTimeHelper } from './helpers/conciliacao-time.service';
import { ConciliacaoStatusService } from './conciliacao-status.service';
import { MovimentoFactory } from './dashboard/factories/movimento.factory';

@Injectable()
export class ConciliacaoService {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject()
  private readonly timeHelper: ConciliacaoTimeHelper;

  @Inject()
  private readonly statusService: ConciliacaoStatusService;

  @Inject()
  private readonly movimentoFactory: MovimentoFactory;

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
      horaNum: this.timeHelper.getHoraNormalizada(item),
      horaFmt: this.timeHelper.getHoraFormatada(item),
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
      await this.statusService.marcarComoConciliado(tx, itens);
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
      await this.statusService.marcarComoDivergente(tx, grupo.itens);

      return { success: true };
    });
  }

  async findByDateDivergentes(
    filialId: number,
    dateRange: { from: string; to: string },
  ) {
    const start = new Date(dateRange.from + 'T00:00:00.000Z');
    const end = new Date(dateRange.to + 'T00:00:00.000Z');
    const conciliacaoItem = await this.prisma.conciliacaoItem.findMany({
      where: {
        grupo: {
          conciliacao: {
            filialId,
          },
          status: 'DIVERGENTE',
        },
        dataReferencia: { gte: start, lte: end },
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
      horaNum: this.timeHelper.getHoraNormalizada(item),
      horaFmt: this.timeHelper.getHoraFormatada(item),
      data: item.dataReferencia,
    }));

    const cieloMap = new Map();
    const resultado = [];

    for (const entry of itens) {
      const { item, cieloValue, horaFmt, horaNum, conciliacaoId, data } = entry;

      // 🔹 TRIER
      if (item.origem === 'TRIER') {
        resultado.push({
          id: item.id,
          grupoId: item.grupoId,
          conciliacaoId,
          horaNum,
          hora: horaFmt,
          valor: item.valor.toFixed(2),
          documentoFiscal: item.trier?.documentoFiscal,
          modalidade: item.trier?.modalidade,
          bandeira: item.trier?.bandeira,
          status: item.trier?.statusConciliacao,
          origem: item.origem,
          data,
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
            data,
            horaNum,
            hora: horaFmt,
            origem: item.origem,
            valor: cieloValue.toFixed(2),
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
              data,
              horaNum,
              hora: horaFmt,
              origem: item.origem,
              valor: cieloValue.toFixed(2),
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
          data,
          horaNum,
          hora: horaFmt,
          origem: item.origem,
          valor: item.valor.toFixed(2),
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
      horaNum: this.timeHelper.getHoraNormalizada(item),
      horaFmt: this.timeHelper.getHoraFormatada(item),
      valorFinal: item.grupo.valorFinal,
      motivo: item.grupo.motivo,
      data: item.dataReferencia,
    }));

    const resultado = itens
      .map((entry) =>
        this.movimentoFactory.build({
          item: entry.item,
          horaFmt: entry.horaFmt,
          horaNum: entry.horaNum,
          conciliacaoId: entry.conciliacaoId,
          data: entry.data,
          motivo: entry.motivo,
          valorFinal: entry.valorFinal,
        }),
      )
      .filter(Boolean);

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
}
