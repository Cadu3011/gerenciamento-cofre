import { Inject } from '@nestjs/common';

import { TrierAuth } from '../contracts/trier.extract.strategy';
import { TrierPipelineStrategy } from '../contracts/trier.pipeline.strategy';
import { TrierParcExtractor } from '../extract/trier.cardExtractor';
import { TrierParcLoad } from '../load/trier.cardLoad';
import { TrierParcTransform } from '../transform/trier.cardTransform';
import { TrierDevolucaoPipeline } from '../devolucao/pipeline/trier.devolucao.pipeline';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

export class TrierParcETLPipeline implements TrierPipelineStrategy {
  @Inject()
  private readonly extractor: TrierParcExtractor;

  @Inject()
  private readonly transform: TrierParcTransform;

  @Inject()
  private readonly loader: TrierParcLoad;

  @Inject()
  private readonly devolucaoPipeline: TrierDevolucaoPipeline;

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

      // Devoluções em cadeia, depois das parcelas. Precisa vir depois do LOAD
      // porque o transform de devolução lê `TrierCartaoVendas`, que é
      // alimentado pelo ETL de cartões — e a marca da devolução é a da venda
      // original.
      //
      // Falha de devolução não derruba as parcelas do dia: são domínios
      // separados, e o dia já foi gravado com sucesso. O erro é reportado e
      // o cron segue para o próximo dia.
      try {
        await this.devolucaoPipeline.execute(ctx, context);
      } catch (error) {
        context.error(
          'DEVOLUCOES',
          `Falha no ETL de devoluções: ${error.message}`,
        );
      }
    } catch (error) {
      context.error(currentStep, error.message);

      throw error;
    } finally {
    }
    context.info('PIPELINE', 'Pipeline Encerrada');
  }
}
