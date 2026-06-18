import { PrismaService } from 'src/database/prisma.service';

import { cardBrands, RedeParcExtracted } from '../infra/http/rede-api.types';
import { Inject } from '@nestjs/common';
import {
  RedeParcTransformedMovement,
  RedeTransformStrategy,
} from '../contracts/rede.transform.strategy';

export class RedeParcTransform implements RedeTransformStrategy<
  RedeParcTransformedMovement[]
> {
  key: string;
  @Inject()
  private readonly prisma: PrismaService;

  async execute(
    ctx: RedeParcExtracted[],
  ): Promise<RedeParcTransformedMovement[]> {
    const movements: RedeParcTransformedMovement[] = [];

    const nsus = [...new Set(ctx.map((x) => String(x.nsu)))];

    const filial = await this.prisma.filial.findFirst({
      where: {
        idRede: String(ctx[0].companyNumber),
      },
    });

    if (!filial) {
      throw new Error('Filial não encontrada');
    }
    const vendas = await this.prisma.redeVenda.findMany({
      where: {
        nsu: {
          in: [...nsus],
        },
        filialId: filial.id,
      },
    });

    const vendasMap = new Map(vendas.map((v) => [v.nsu, v]));
    for (const item of ctx) {
      // const filial = await this.prisma.filial.findFirst({
      //   where: { idRede: String(item.companyNumber) },
      // });
      // const venda = await this.prisma.redeVenda.findFirst({
      //   where: {
      //     nsu: String(item.nsu),
      //     filialId: filial.id,
      //   },
      //   select: { id: true },
      // });

      const venda = vendasMap.get(String(item.nsu));
      if (!venda) {
        throw new Error(
          `Venda não encontrada. NSU=${item.nsu} Filial=${filial.id}`,
        );
      }
      movements.push({
        idempotencyKey: `|${item.nsu}|${item.saleDate}|${filial.id}`,
        nsu: String(item.nsu),
        valor: String(item.amount),
        valorLiquido: String(item.netAmount),
        dataVenda: new Date(`${item.saleDate}T00:00:00`),
        filialId: filial.id,
        taxa: item.discountAmount,
        parcela: item.installmentQuantity,
        totalParcelas: item.installmentQuantity,
        vencimento: new Date(`${item.expirationDate}T00:00:00`),
        vendaId: venda.id,
      });
    }

    return movements;
  }
}
