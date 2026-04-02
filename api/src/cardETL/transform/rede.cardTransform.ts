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
        nsu: String(item.nsu),
        valor:
          item.status === 'REVERSED'
            ? String(item.tracking.find((t) => t.status === 'REVERSED')?.amount)
            : String(item.amount),
        valorLiquido:
          item.status === 'REVERSED'
            ? String(item.tracking.find((t) => t.status === 'REVERSED')?.amount)
            : String(item.netAmount),
        modalidade: item.modality.type,
        horaVenda: item.saleHour
          ? new Date(`1970-01-01T${item.saleHour}`)
          : null,
        dataVenda: new Date(`${item.saleDate}T00:00:00`),
        filialId: filial.id,
        bandeira: brand,
        status: item.status,
      });
    }
    return movements;
  }
}
