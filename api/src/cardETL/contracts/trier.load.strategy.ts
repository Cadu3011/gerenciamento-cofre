import { TrierCardTransformedMovement } from './trier.transform.strategyc';

export interface TrierLoadStrategy<TOut = unknown> {
  readonly key: string;
  execute(ctx: TrierCardTransformedMovement[]): Promise<TOut>;
}
