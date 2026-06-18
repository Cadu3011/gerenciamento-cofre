import { RedeParcExtracted } from '../infra/http/rede-api.types';

export interface RedeTransformStrategy<TOut = unknown> {
  readonly key: string;
  execute(ctx: RedeParcExtracted[]): Promise<TOut>;
}

export interface RedeParcTransformedMovement {
  idempotencyKey: string;
  dataVenda: Date;
  nsu: string;
  vencimento: Date;
  totalParcelas: number;
  parcela: number;
  valor: number | string;
  valorLiquido: number | string;
  taxa: number | string;
  filialId: number;
  vendaId: number;
}
