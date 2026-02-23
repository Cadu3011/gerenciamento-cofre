import { Inject } from '@nestjs/common';
import { TrierPipelineStrategy } from '../contracts/trier.pipeline.strategy';
import { CardExtractor } from '../extract/cardExtractor';
import { TrierAuth } from '../contracts/trier.extract.strategy';
import { CardTransform } from '../transform/cardTransform';
import { CardLoad } from '../load/cardLoad';

export class CardETLPipeline implements TrierPipelineStrategy {
  @Inject()
  private readonly extractor: CardExtractor;

  @Inject()
  private readonly transform: CardTransform;

  @Inject()
  private readonly loader: CardLoad;

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
