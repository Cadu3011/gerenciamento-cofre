import { Inject } from '@nestjs/common';
import { TrierCardExtractor } from '../extract/trier.cardExtractor';
import { TrierCardTransform } from '../transform/trier.cardTransform';
import { TrierCardLoad } from '../load/trier.cardLoad';
import { TrierAuth } from '../contracts/trier.extract.strategy';
import { TrierPipelineStrategy } from '../contracts/trier.pipeline.strategy';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

export class TrierCardETLPipeline implements TrierPipelineStrategy {
  @Inject()
  private readonly extractor: TrierCardExtractor;

  @Inject()
  private readonly transform: TrierCardTransform;

  @Inject()
  private readonly loader: TrierCardLoad;

  key = 'CARD_ETL';
  async execute(ctx: TrierAuth, context: JobExecutionContext) {
    let currentStep = '';

    try {
      currentStep = 'EXTRACT';
      context.startStep(currentStep);
      const rawData = await this.extractor.execute(ctx);
      const totalExtractCount =
        rawData.devolucoes.length +
        rawData.vendas.length +
        rawData.vendasParcela.transacoes.length;
      context.incrementExtracted(totalExtractCount);
      await context.endStep(
        currentStep,
        `${totalExtractCount} Registros extraidos`,
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
      await context.endStep(currentStep, `${inserteds} Linhas registradas`);
    } catch (error) {
      context.error(
        currentStep,
        error?.stack ?? error?.message ?? 'Erro desconhecido',
      );

      throw error;
    } finally {
      context.info('PIPELINE', 'Pipeline encerrada');
    }
  }
}
