import { Inject, Injectable } from '@nestjs/common';
import { TrierApiClient } from '../infra/http/trier-api.client';
import {
  TrierExtractStrategy,
  TrierAuth,
  isApiError,
} from '../contracts/trier.extract.strategy';
import { MoveParcExtracted } from '../infra/http/trier-api.types';

@Injectable()
export class TrierParcExtractor implements TrierExtractStrategy<MoveParcExtracted> {
  key: string;
  @Inject()
  private trierApiClient: TrierApiClient;

  async execute(ctx: TrierAuth): Promise<MoveParcExtracted[]> {
    const vendasParcela = await this.trierApiClient.getParcelasCartao(
      ctx.date,
      ctx.tokenLocalTrier,
      ctx.urlLocalTrier,
    );

    if (isApiError(vendasParcela)) {
      console.error(vendasParcela.message);
      return;
    }
    return vendasParcela;
  }
}
