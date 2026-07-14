import { Inject, Injectable } from '@nestjs/common';
import { Prisma, StatusConciliacao } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { Data } from './contract';

@Injectable()
export class ExtractParc {
  @Inject()
  private readonly prisma: PrismaService;

  async execute(
    date: string,
    filialId: number,
  ): Promise<{
    data: Data;
  }> {
    const trier = await this.prisma.trierParcela.findMany({
      where: {
        dataEmissao: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        },
        filialId,
        statusConciliacao: 'PENDENTE',
      },
    });
    const rede = await this.prisma.redeParcela.findMany({
      where: {
        dataVenda: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        },
        filialId,
        statusConciliacao: 'PENDENTE',
      },
    });

    const cielo = await this.prisma.cieloParcela.findMany({
      where: {
        dataVenda: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        },
        filialId,
        statusConciliacao: 'PENDENTE',
      },
    });

    const conciliacoesVenda = await this.prisma.conciliacaoGrupo.findMany({
      where: {
        status: StatusConciliacao.CONCILIADO,
        conciliacao: {
          filialId,
          startDate: {
            gte: new Date(`${date}T00:00:00.000Z`),
            lte: new Date(`${date}T23:59:59.999Z`),
          },
        },
      },
      select: {
        itens: { select: { redeId: true, cieloId: true, trierId: true } },
      },
    });

    return { data: { trier, rede, cielo, conciliacoesVenda } };
  }
}
