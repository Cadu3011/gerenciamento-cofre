import { Inject, Injectable } from '@nestjs/common';
import { TrierLoadStrategy } from '../contracts/trier.load.strategy';
import { TrierCardTransformedMovement } from '../contracts/trier.transform.strategyc';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class CardLoad implements TrierLoadStrategy {
  @Inject()
  private readonly prisma: PrismaService;

  async execute(ctx: TrierCardTransformedMovement[]): Promise<string> {
    await prisma;
  }
}
