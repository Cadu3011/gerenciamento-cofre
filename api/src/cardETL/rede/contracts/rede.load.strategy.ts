import { RedeCardTransformedMovement } from './rede.transform.strategy';

export interface RedeLoadStrategy<TOut = unknown> {
  readonly key: string;
  execute(ctx: RedeCardTransformedMovement[]): Promise<TOut>;
}
