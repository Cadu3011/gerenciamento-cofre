import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';
import { TrierParcTransformedMovement } from './trier.transform.strategyc';

export interface TrierLoadStrategy<TOut = unknown> {
  readonly key: string;
  execute(
    ctx: TrierParcTransformedMovement[],
    context: JobExecutionContext,
  ): Promise<TOut>;
}
