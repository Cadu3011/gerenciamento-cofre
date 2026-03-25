import { Inject } from '@nestjs/common';
import { RedeLoadStrategy } from '../contracts/rede.load.strategy';
import { RedeCardTransformedMovement } from '../contracts/rede.transform.strategy';
import { PrismaService } from 'src/database/prisma.service';

export class RedeCardLoad implements RedeLoadStrategy {
  key: string;

  @Inject()
  private readonly prisma: PrismaService;

  async execute(ctx: RedeCardTransformedMovement[]) {
    console.log(ctx);
  }
}
