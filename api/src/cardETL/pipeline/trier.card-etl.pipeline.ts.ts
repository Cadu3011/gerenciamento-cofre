import { Inject } from '@nestjs/common';
import { TrierPipelineStrategy } from '../contracts/trier.pipeline.strategy';
import { TrierCardExtractor } from '../extract/trier.cardExtractor';
import { TrierAuth } from '../contracts/trier.extract.strategy';
import { TrierCardTransform } from '../transform/trier.cardTransform';
import { TrierCardLoad } from '../load/trier.cardLoad';

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
