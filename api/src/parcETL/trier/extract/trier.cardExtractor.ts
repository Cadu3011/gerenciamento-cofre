import { Inject, Injectable } from '@nestjs/common';
import { TrierApiClient } from '../infra/http/trier-api.client';
import {
  TrierExtractStrategy,
  TrierAuth,
  isApiError,
} from '../contracts/trier.extract.strategy';
import { MoveParcExtracted } from '../infra/http/trier-api.types';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

@Injectable()
export class TrierParcExtractor implements TrierExtractStrategy<MoveParcExtracted> {
  key: string;
  @Inject()
  private trierApiClient: TrierApiClient;

  async execute(
    ctx: TrierAuth,
    context: JobExecutionContext,
  ): Promise<MoveParcExtracted[]> {
    try {
      const vendasParcela = await this.trierApiClient.getParcelasCartao(
        ctx.date,
        ctx.tokenLocalTrier,
        ctx.urlLocalTrier,
      );

      if (isApiError(vendasParcela)) {
        console.error(vendasParcela.message);
        throw vendasParcela.message;
      }
      context.info('EXTRACT', `${vendasParcela.length} Registros extraidos`);
      context.incrementExtracted(vendasParcela.length);
      return vendasParcela;
    } catch (error) {
      context.error('EXTRACT', error);
      throw error;
    }
  }
}
