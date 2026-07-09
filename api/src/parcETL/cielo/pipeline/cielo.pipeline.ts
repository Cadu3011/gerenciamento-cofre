import { Inject, Injectable } from '@nestjs/common';
import { CieloParcTransform } from '../transform/cielo.cardTransform';
import { CieloParcLoad } from '../load/cielo.cardLoad';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

Injectable();
export class CieloParcETLPipeline {
  @Inject()
  private readonly transform: CieloParcTransform;

  @Inject()
  private readonly load: CieloParcLoad;
  async execute(fileNames: string[], context: JobExecutionContext) {
    let currentStep = '';
    try {
      currentStep = 'TRANSFORM';
      context.startStep(currentStep);
      const data = await this.transform.execute(fileNames);
      context.incrementExtracted(data.length);
      context.incrementFiles(fileNames.length);
      await context.endStep(currentStep, `Registros extraidos`);
      currentStep = 'LOAD';
      context.startStep(currentStep);
      const inserteds = await this.load.execute(data);
      context.incrementInserted(inserteds);
      await context.endStep(currentStep, `${inserteds} Linhas registradas`);
    } catch (error) {
      context.error(currentStep, error.message);

      throw error;
    } finally {
      context.info('PIPELINE', 'Pipeline encerrada');
    }
  }
}
