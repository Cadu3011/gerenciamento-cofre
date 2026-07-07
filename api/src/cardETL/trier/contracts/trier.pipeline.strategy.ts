import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';
import { TrierAuth } from './trier.extract.strategy';

export interface TrierPipelineStrategy<TResult = unknown> {
  /**
   * Identificador da pipeline (usado por factory/registry)
   */
  readonly key: string;

  /**
   * Executa o ETL completo
   */
  execute(ctx: TrierAuth, context: JobExecutionContext): Promise<TResult>;
}
