import { Inject } from '@nestjs/common';

import { TrierAuth } from '../contracts/trier.extract.strategy';
import { TrierPipelineStrategy } from '../contracts/trier.pipeline.strategy';
import { TrierParcExtractor } from '../extract/trier.cardExtractor';
import { TrierParcLoad } from '../load/trier.cardLoad';
import { TrierParcTransform } from '../transform/trier.cardTransform';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

export class TrierParcETLPipeline implements TrierPipelineStrategy {
  @Inject()
  private readonly extractor: TrierParcExtractor;

  @Inject()
  private readonly transform: TrierParcTransform;

  @Inject()
  private readonly loader: TrierParcLoad;

  key = 'Parc_ETL';
  async execute(ctx: TrierAuth, context: JobExecutionContext) {
    context.info('PIPELINE', 'Pipeline Iniciada');
    const rawData = await this.extractor.execute(ctx, context);
    const trasformed = await this.transform.execute(rawData, context);
    await this.loader.execute(trasformed, context);
    context.info('PIPELINE', 'Pipeline Encerrada');
  }
}
