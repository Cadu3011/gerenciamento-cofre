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
    let currentStep = '';
    try {
      currentStep = 'EXTRACT';
      context.startStep(currentStep);
      const rawData = await this.extractor.execute(ctx);
      context.incrementExtracted(rawData.length);
      await context.endStep(
        currentStep,
        `${rawData.length} Registros extraidos`,
      );
      currentStep = 'TRANSFORM';
      context.startStep(currentStep);
      const trasformed = await this.transform.execute(rawData);
      await context.endStep(
        currentStep,
        `${trasformed.length} Registros transformados`,
      );
      currentStep = 'LOAD';
      context.startStep(currentStep);
      const inserteds = await this.loader.execute(trasformed);
      context.incrementInserted(inserteds);
      await context.endStep(currentStep, `${inserteds} Linhas Inseridas`);
    } catch (error) {
      context.error(currentStep, error.message);

      throw error;
    } finally {
    }
    context.info('PIPELINE', 'Pipeline Encerrada');
  }
}
