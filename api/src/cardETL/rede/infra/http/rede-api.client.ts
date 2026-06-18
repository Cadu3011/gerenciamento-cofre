import { Inject } from '@nestjs/common';
import { RedeService } from 'src/rede/rede.service';
import { RedeAuth } from '../../contracts/rede.extract.strategy';
import { RedeCardsExtracted } from './rede-api.types';

export class RedeApiClient {
  @Inject()
  private readonly redeService: RedeService;

  async getVendasCartao(authData: RedeAuth): Promise<RedeCardsExtracted[]> {
    return this.redeService.findSalesDetails(
      authData.idRede,
      authData.date,
    ) as Promise<RedeCardsExtracted[]>;
  }
}
