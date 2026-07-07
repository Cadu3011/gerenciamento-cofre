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
    try {
      context.startStep('EXTRACT');
      const rawData = await this.extractor.execute(ctx);
      const totalExtractCount =
        rawData.devolucoes.length +
        rawData.vendas.length +
        rawData.vendasParcela.transacoes.length;
      context.incrementExtracted(totalExtractCount);
      context.endStep('EXTRACT', `${totalExtractCount} Registros extraidos`);
      context.startStep('TRANSFORM');
      const trasformed = await this.transform.execute(rawData);
      context.endStep(
        'TRANSFORM',
        `${trasformed.length} Registros transformados`,
      );
      context.startStep('LOAD');
      const inserteds = await this.loader.execute(trasformed);
      context.incrementInserted(inserteds);
      context.endStep('LOAD', `${inserteds} Linhas registradas`);
    } finally {
      context.info('PIPELINE', 'Pipeline encerrada');
    }
  }
}
