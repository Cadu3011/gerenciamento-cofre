import { Inject } from '@nestjs/common';
import { RedeService } from 'src/rede/rede.service';
import { RedeAuth } from '../../contracts/rede.extract.strategy';
import { RedeParcExtracted } from './rede-api.types';

export class RedeApiClient {
  @Inject()
  private readonly redeService: RedeService;

  async getParcelasCartao(authData: RedeAuth): Promise<RedeParcExtracted[]> {
    return this.redeService.findParcDetails(authData.idRede, authData.date);
  }
}
