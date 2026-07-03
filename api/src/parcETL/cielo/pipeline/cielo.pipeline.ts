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
    context.info('PIPELINE', 'Pipeline iniciada');
    const data = await this.transform.execute(fileNames, context);

    await this.load.execute(data, context);
    context.info('PIPELINE', 'Pipeline encerrada');
  }
}
