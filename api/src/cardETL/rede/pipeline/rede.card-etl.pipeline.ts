import { Inject } from '@nestjs/common';
import { RedeCardsExtractor } from '../extract/rede.cardExtractor';
import { RedeCardTransform } from '../transform/rede.cardTransform';
import { RedeCardLoad } from '../load/rede.cardLoad';
import { RedeAuth } from '../contracts/rede.extract.strategy';
import { RedePipelineStrategy } from '../contracts/rede.pipeline.strategy';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

export class RedeCardETLPipeline implements RedePipelineStrategy {
  @Inject()
  private readonly extractor: RedeCardsExtractor;

  @Inject()
  private readonly transform: RedeCardTransform;

  @Inject()
  private readonly loader: RedeCardLoad;

  key = 'CARD_ETL';
  async execute(ctx: RedeAuth, context: JobExecutionContext) {
    try {
      context.startStep('EXTRACT');
      const rawData = await this.extractor.execute(ctx);
      context.incrementExtracted(rawData.length);
      await context.endStep('EXTRACT', `${rawData.length} registros extraídos`);
      context.startStep('TRANSFORM');
      const transformed = await this.transform.execute(rawData);
      await context.endStep(
        'TRANSFORM',
        `${transformed.length} registros transformados`,
      );
      context.startStep('LOAD');
      const inserteds = await this.loader.execute(transformed);
      context.incrementInserted(inserteds);
      await context.endStep('LOAD', `${inserteds} linhas inseridas`);
    } finally {
      context.info('PIPELINE', `Pipeline encerrada`);
    }
  }
}
