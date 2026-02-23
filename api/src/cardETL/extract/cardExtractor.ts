import { Inject, Injectable } from '@nestjs/common';
import { TrierApiClient } from '../infra/http/trier-api.client';

import {
  isApiError,
  MoveCardsExtracted,
  TrierAuth,
  TrierExtractStrategy,
} from '../contracts/trier.extract.strategy';

@Injectable()
export class CardExtractor implements TrierExtractStrategy<MoveCardsExtracted> {
  key: string;
  @Inject()
  private trierApiClient: TrierApiClient;

  async execute(ctx: TrierAuth): Promise<MoveCardsExtracted> {
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
    if (isApiError(vendas)) {
      console.error(vendas.message);
      return;
    }
    if (isApiError(devolucoes)) {
      console.error(devolucoes.message);
      return;
    }
    if (isApiError(vendasParcela)) {
      console.error(vendasParcela.message);
      return;
    }
    return {
      vendas: vendas,
      devolucoes: devolucoes,
      vendasParcela: vendasParcela,
    };
  }
}
