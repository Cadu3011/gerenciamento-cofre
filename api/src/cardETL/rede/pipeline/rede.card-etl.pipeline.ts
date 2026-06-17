import { Inject } from '@nestjs/common';
import { RedeCardsExtractor } from '../extract/rede.cardExtractor';
import { RedeCardTransform } from '../transform/rede.cardTransform';
import { RedeCardLoad } from '../load/rede.cardLoad';
import { RedeAuth } from '../contracts/rede.extract.strategy';
import { RedePipelineStrategy } from '../contracts/rede.pipeline.strategy';

export class RedeCardETLPipeline implements RedePipelineStrategy {
  @Inject()
  private readonly extractor: RedeCardsExtractor;

  @Inject()
  private readonly transform: RedeCardTransform;

  @Inject()
  private readonly loader: RedeCardLoad;

  key = 'CARD_ETL';
  async execute(ctx: RedeAuth) {
    const rawData = await this.extractor.execute(ctx);
    const trasformed = await this.transform.execute(rawData);
    return {
      message: await this.loader.execute(trasformed),
      lastUpdatedDate: ctx.date,
    };
  }
}
