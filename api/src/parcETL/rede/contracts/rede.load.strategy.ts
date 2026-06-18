import { RedeParcTransformedMovement } from './rede.transform.strategy';

export interface RedeLoadStrategy<TOut = unknown> {
  readonly key: string;
  execute(ctx: RedeParcTransformedMovement[]): Promise<TOut>;
}
