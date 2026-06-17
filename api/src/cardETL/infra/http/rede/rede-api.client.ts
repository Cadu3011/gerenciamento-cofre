import { Inject } from '@nestjs/common';
import { RedeAuth } from 'src/cardETL/contracts/rede.extract.strategy';
import { RedeService } from 'src/rede/rede.service';
import { RedeCardsExtracted, RedeParcExtracted } from './rede-api.types';

export class RedeApiClient {
  @Inject()
  private readonly redeService: RedeService;

  async getVendasCartao(authData: RedeAuth): Promise<RedeCardsExtracted[]> {
    return this.redeService.findSalesDetails(
      authData.idRede,
      authData.date,
    ) as Promise<RedeCardsExtracted[]>;
  }
  async getParcelasCartao(authData: RedeAuth): Promise<RedeParcExtracted[]> {
    return this.redeService.findParcDetails(authData.idRede, authData.date);
  }
}
