import { RedeAuth } from './rede.extract.strategy';

export interface RedePipelineStrategy<TResult = unknown> {
  /**
   * Identificador da pipeline (usado por factory/registry)
   */
  readonly key: string;

  /**
   * Executa o ETL completo
   */
  execute(ctx: RedeAuth): Promise<TResult>;
}
