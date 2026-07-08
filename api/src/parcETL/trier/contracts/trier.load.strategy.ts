import { TrierParcTransformedMovement } from './trier.transform.strategyc';

export interface TrierLoadStrategy<TOut = unknown> {
  readonly key: string;
  execute(ctx: TrierParcTransformedMovement[]): Promise<TOut>;
}
