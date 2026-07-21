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
        statusConciliacao: { not: 'CONCILIADO' },
      },
    });
    const rede = await this.prisma.redeParcela.findMany({
      where: {
        dataVenda: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        },
        filialId,
        statusConciliacao: { not: 'CONCILIADO' },
      },
    });

    const cielo = await this.prisma.cieloParcela.findMany({
      where: {
        dataVenda: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        },
        filialId,
        statusConciliacao: { not: 'CONCILIADO' },
      },
    });

    const conciliacoesVenda = await this.prisma.conciliacaoGrupo.findMany({
      where: {
        status: StatusConciliacao.CONCILIADO,
        conciliacao: {
          filialId,
        },
        itens: {
          some: {
            dataReferencia: new Date(`${date}T00:00:00.000Z`),
          },
        },
      },
      select: {
        itens: { select: { redeId: true, cieloId: true, trierId: true } },
      },
    });

    const trierIdsConc = new Set<number>();
    const redeIdsConc = new Set<number>();
    const cieloIdsConc = new Set<number>();
    for (const conc of conciliacoesVenda) {
      for (const item of conc.itens) {
        if (item.trierId) trierIdsConc.add(item.trierId);
        if (item.redeId) redeIdsConc.add(item.redeId);
        if (item.cieloId) cieloIdsConc.add(item.cieloId);
      }
    }

    const trierIdsAtuais = new Set(trier.map((t) => t.id));
    if (trierIdsConc.size > 0) {
      const adicionais = await this.prisma.trierParcela.findMany({
        where: {
          vendaId: { in: [...trierIdsConc] },
          filialId,
          statusConciliacao: { not: 'CONCILIADO' },
        },
      });
      for (const t of adicionais) {
        if (!trierIdsAtuais.has(t.id)) trier.push(t);
      }
    }

    const redeIdsAtuais = new Set(rede.map((r) => r.id));
    if (redeIdsConc.size > 0) {
      const adicionais = await this.prisma.redeParcela.findMany({
        where: {
          vendaId: { in: [...redeIdsConc] },
          filialId,
          statusConciliacao: { not: 'CONCILIADO' },
        },
      });
      for (const r of adicionais) {
        if (!redeIdsAtuais.has(r.id)) rede.push(r);
      }
    }

    const cieloIdsAtuais = new Set(cielo.map((c) => c.id));
    if (cieloIdsConc.size > 0) {
      const adicionais = await this.prisma.cieloParcela.findMany({
        where: {
          vendaId: { in: [...cieloIdsConc] },
          filialId,
          statusConciliacao: { not: 'CONCILIADO' },
        },
      });
      for (const c of adicionais) {
        if (!cieloIdsAtuais.has(c.id)) cielo.push(c);
      }
    }

    return { data: { trier, rede, cielo, conciliacoesVenda } };
  }
}
