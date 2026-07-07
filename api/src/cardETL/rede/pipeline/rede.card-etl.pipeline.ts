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
    let currentStep = '';

    try {
      currentStep = 'EXTRACT';
      context.startStep(currentStep);
      const rawData = await this.extractor.execute(ctx);
      context.incrementExtracted(rawData.length);
      await context.endStep(
        currentStep,
        `${rawData.length} registros extraídos`,
      );
      currentStep = 'TRANSFORM';
      context.startStep(currentStep);
      const transformed = await this.transform.execute(rawData);
      await context.endStep(
        currentStep,
        `${transformed.length} registros transformados`,
      );
      currentStep = 'LOAD';
      context.startStep(currentStep);
      const inserteds = await this.loader.execute(transformed);
      context.incrementInserted(inserteds);
      await context.endStep(currentStep, `${inserteds} linhas inseridas`);
    } catch (error) {
      context.error(currentStep, error.message);

      throw error.message;
    } finally {
      context.info('PIPELINE', `Pipeline encerrada`);
    }
  }
}
