import { Inject, Injectable } from '@nestjs/common';
import { TrierApiClient } from '../infra/http/trier-api.client';

import {
  MoveCardsExtracted,
  TrierAuth,
  TrierExtractStrategy,
} from '../contracts/trier.extract.strategy';

@Injectable()
export class CardExtractor implements TrierExtractStrategy<MoveCardsExtracted> {
  key: string;
  @Inject()
  private trierApiClient: TrierApiClient;

  async execute(ctx: TrierAuth) {
    const [vendas, devolucoes, vendasParcela] = await Promise.all([
      this.trierApiClient.getVendas(
        ctx.date,
        ctx.tokenLocalTrier,
        ctx.urlLocalTrier,
      ),
      this.trierApiClient.getCancelamentos(
        ctx.date,
        ctx.tokenLocalTrier,
        ctx.urlLocalTrier,
      ),
      this.trierApiClient.getParcelasCartao(
        ctx.date,
        ctx.tokenLocalTrier,
        ctx.urlLocalTrier,
      ),
    ]);

    return {
      vendas: vendas,
      devolucoes: devolucoes,
      vendasParcela: vendasParcela,
    };
  }
}
