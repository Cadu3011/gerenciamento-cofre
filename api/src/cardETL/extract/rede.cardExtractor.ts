import { Inject } from '@nestjs/common';
import {
  RedeAuth,
  RedeExtractStrategy,
} from '../contracts/rede.extract.strategy';
import { RedeApiClient } from '../infra/http/rede-api.client';
import { RedeCardsExtracted } from '../infra/http/rede-api.types';

export class RedeCardsExtractor implements RedeExtractStrategy<
  RedeCardsExtracted[]
> {
  key: string;
  @Inject()
  private readonly redeApiClient: RedeApiClient;

  async execute(ctx: RedeAuth): Promise<RedeCardsExtracted[]> {
    try {
      const vendas = await this.redeApiClient.getVendasCartao(ctx);

      return vendas;
    } catch (error) {
      console.log(error);
      throw new Error('Failed to extract cards from Rede API');
    }
  }
}
