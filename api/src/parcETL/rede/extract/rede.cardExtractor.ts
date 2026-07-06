import { Inject, Logger } from '@nestjs/common';

import { RedeParcExtracted } from '../infra/http/rede-api.types';
import {
  RedeExtractStrategy,
  RedeAuth,
} from '../contracts/rede.extract.strategy';
import { RedeApiClient } from '../infra/http/rede-api.client';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

export class RedeParcExtractor implements RedeExtractStrategy<
  RedeParcExtracted[]
> {
  key: string;
  @Inject()
  private readonly redeApiClient: RedeApiClient;

  private readonly logger = new Logger(RedeParcExtractor.name);
  async execute(
    ctx: RedeAuth,
    context: JobExecutionContext,
  ): Promise<RedeParcExtracted[]> {
    try {
      const parc = await this.redeApiClient.getParcelasCartao(ctx);
      context.incrementExtracted(parc.length);
      context.info('EXTRACT', `${parc.length} Registros extraidos`);
      return parc;
    } catch (error) {
      context.error('EXTRACT', error.message);
      this.logger.log(error);
      throw new Error('Failed to extract parc from Rede API');
    }
  }
}
