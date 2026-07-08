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
    let currentStep = '';
    try {
      currentStep = 'EXTRACT';
      context.startStep(currentStep);
      const rawData = await this.extractor.execute(ctx);
      context.incrementExtracted(rawData.length);
      context.endStep(currentStep, `${rawData.length} Registros extraidos`);
      currentStep = 'TRANSFORM';
      context.startStep(currentStep);
      const trasformed = await this.transform.execute(rawData);
      context.endStep(
        currentStep,
        `${trasformed.length} Registros transformados`,
      );
      currentStep = 'LOAD';
      context.startStep(currentStep);
      const inserteds = await this.loader.execute(trasformed, context);
      context.incrementInserted(inserteds);
      context.endStep(currentStep, `${inserteds} Linhas registradas`);
    } catch (error) {
      context.error(currentStep, error.message);

      throw error;
    } finally {
      context.info('PIPELINE', 'Pipeline Encerrada');
    }
  }
}
