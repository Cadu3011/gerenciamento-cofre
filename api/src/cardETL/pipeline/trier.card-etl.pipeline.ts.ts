import { Inject } from '@nestjs/common';
import { TrierCardExtractor } from '../extract/trier/trier.cardExtractor';
import { TrierCardTransform } from '../transform/trier.cardTransform';
import { TrierCardLoad } from '../load/trier.cardLoad';
import { TrierAuth } from '../contracts/trier/trier.extract.strategy';
import { TrierPipelineStrategy } from '../contracts/trier/trier.pipeline.strategy';

export class TrierCardETLPipeline implements TrierPipelineStrategy {
  @Inject()
  private readonly extractor: TrierCardExtractor;

  @Inject()
  private readonly transform: TrierCardTransform;

  @Inject()
  private readonly loader: TrierCardLoad;

  key = 'CARD_ETL';
  async execute(ctx: TrierAuth) {
    const rawData = await this.extractor.execute(ctx);
    const trasformed = await this.transform.execute(rawData);
    return {
      message: await this.loader.execute(trasformed),
      lastUpdatedDate: ctx.date,
    };
  }
}
