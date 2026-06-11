import { Injectable } from '@nestjs/common';
import { ConciliacaoItem, Prisma, StatusConciliacao } from '@prisma/client';

@Injectable()
export class ConciliacaoStatusService {
  async marcarComoConciliado(
    tx: Prisma.TransactionClient,
    itens: ConciliacaoItem[],
  ) {
    return this.updateStatus(tx, itens, StatusConciliacao.CONCILIADO);
  }

  async marcarComoDivergente(
    tx: Prisma.TransactionClient,
    itens: ConciliacaoItem[],
  ) {
    return this.updateStatus(tx, itens, StatusConciliacao.DIVERGENTE);
  }

  private async updateStatus(
    tx: Prisma.TransactionClient,
    itens: any[],
    status: StatusConciliacao,
  ) {
    const trierIds = itens.map((i) => i.trierId).filter(Boolean);

    const redeIds = itens.map((i) => i.redeId).filter(Boolean);

    const cieloIds = itens.map((i) => i.cieloId).filter(Boolean);

    if (trierIds.length) {
      await tx.trierCartaoVendas.updateMany({
        where: {
          id: {
            in: trierIds,
          },
        },
        data: {
          statusConciliacao: status,
        },
      });
    }

    if (redeIds.length) {
      await tx.redeVenda.updateMany({
        where: {
          id: {
            in: redeIds,
          },
        },
        data: {
          statusConciliacao: status,
        },
      });
    }

    if (cieloIds.length) {
      await tx.cartaoVendas.updateMany({
        where: {
          id: {
            in: cieloIds,
          },
        },
        data: {
          statusConciliacao: status,
        },
      });
    }
  }
}
