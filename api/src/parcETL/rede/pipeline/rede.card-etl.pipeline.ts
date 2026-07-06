import { Inject } from '@nestjs/common';
import { RedeAuth } from '../contracts/rede.extract.strategy';
import { RedePipelineStrategy } from '../contracts/rede.pipeline.strategy';
import { RedeParcExtractor } from '../extract/rede.cardExtractor';
import { RedeParcLoad } from '../load/rede.cardLoad';
import { RedeParcTransform } from '../transform/rede.cardTransform';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

export class RedeParcETLPipeline implements RedePipelineStrategy {
  @Inject()
  private readonly extractor: RedeParcExtractor;

  @Inject()
  private readonly transform: RedeParcTransform;

  @Inject()
  private readonly loader: RedeParcLoad;

  key = 'CARD_ETL';
  async execute(ctx: RedeAuth, context: JobExecutionContext) {
    context.info('PIPELINE', 'Pipeline Iniciada');
    const rawData = await this.extractor.execute(ctx, context);
    const trasformed = await this.transform.execute(rawData, context);
    await this.loader.execute(trasformed, context);
    context.info('PIPELINE', 'Pipeline Encerrada');
  }
}
