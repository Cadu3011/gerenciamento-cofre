import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';
import { RedeParcTransformedMovement } from './rede.transform.strategy';

export interface RedeLoadStrategy<TOut = unknown> {
  readonly key: string;
  execute(
    ctx: RedeParcTransformedMovement[],
    context: JobExecutionContext,
  ): Promise<TOut>;
}
