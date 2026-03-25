import { PrismaService } from 'src/database/prisma.service';
import {
  RedeCardTransformedMovement,
  RedeTransformStrategy,
} from '../contracts/rede.transform.strategy';
import { cardBrands, RedeCardsExtracted } from '../infra/http/rede-api.types';
import { Inject } from '@nestjs/common';

export class RedeCardTransform implements RedeTransformStrategy<
  RedeCardTransformedMovement[]
> {
  key: string;
  @Inject()
  private readonly prisma: PrismaService;

  async execute(
    ctx: RedeCardsExtracted[],
  ): Promise<RedeCardTransformedMovement[]> {
    const movements: RedeCardTransformedMovement[] = [];
    for (const item of ctx) {
      const filial = await this.prisma.filial.findFirst({
        where: { idRede: String(item.merchant.companyNumber) },
      });
      const brand = cardBrands.find(
        (c) => c.brandCode === item.brandCode,
      )?.brand;
      movements.push({
        idempotencyKey: `|${item.nsu}|${item.saleDate}|${item.saleHour}|${filial.id}`,
        nsu: item.nsu,
        valor: String(item.amount),
        valorLiquido: String(item.netAmount),
        modalidade: item.modality.type,
        hora: item.saleHour,
        filialId: filial.id,
        bandeira: brand,
        dataVenda: item.saleDate,
      });
    }
    return movements;
  }
}
