import { Inject, Logger } from '@nestjs/common';

import { RedeApiClient } from '../../infra/http/rede/rede-api.client';
import { RedeCardsExtracted } from '../../infra/http/rede/rede-api.types';
import {
  RedeExtractStrategy,
  RedeAuth,
} from 'src/cardETL/contracts/rede/rede.extract.strategy';

export class RedeCardsExtractor implements RedeExtractStrategy<
  RedeCardsExtracted[]
> {
  key: string;
  @Inject()
  private readonly redeApiClient: RedeApiClient;

  private readonly logger = new Logger(RedeCardsExtractor.name);
  async execute(ctx: RedeAuth): Promise<RedeCardsExtracted[]> {
    try {
      const vendas = await this.redeApiClient.getVendasCartao(ctx);

      return vendas;
    } catch (error) {
      this.logger.log(error);
      throw new Error('Failed to extract cards from Rede API');
    }
  }
}
