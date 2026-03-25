import { RedeCardsExtracted } from '../infra/http/rede-api.types';

export interface RedeTransformStrategy<TOut = unknown> {
  readonly key: string;
  execute(ctx: RedeCardsExtracted[]): Promise<TOut>;
}

export interface RedeCardTransformedMovement {
  idempotencyKey: string;
  nsu: string;
  valor: number | string;
  valorLiquido: number | string;
  modalidade: string | null;
  hora: string;
  filialId: number;
  bandeira: string;
  dataVenda: string;
}
