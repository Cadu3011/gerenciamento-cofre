import { Inject } from '@nestjs/common';

import { TrierAuth } from '../contracts/trier.extract.strategy';
import { TrierPipelineStrategy } from '../contracts/trier.pipeline.strategy';
import { TrierParcExtractor } from '../extract/trier.cardExtractor';
import { TrierParcLoad } from '../load/trier.cardLoad';
import { TrierParcTransform } from '../transform/trier.cardTransform';

export class TrierParcETLPipeline implements TrierPipelineStrategy {
  @Inject()
  private readonly extractor: TrierParcExtractor;

  @Inject()
  private readonly transform: TrierParcTransform;

  @Inject()
  private readonly loader: TrierParcLoad;

  key = 'Parc_ETL';
  async execute(ctx: TrierAuth) {
    const rawData = await this.extractor.execute(ctx);
    const trasformed = await this.transform.execute(rawData);
    return {
      message: await this.loader.execute(trasformed),
      lastUpdatedDate: ctx.date,
    };
  }
}
