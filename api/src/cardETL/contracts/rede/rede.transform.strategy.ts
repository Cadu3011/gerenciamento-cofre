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
  horaVenda: Date;
  filialId: number;
  bandeira: string;
  dataVenda: Date;
  status: string;
}

export interface RedeParcTransformedMovement {
  idempotencyKey: string;
  dataVenda: string;
  companyNumber: string;
  nsu: string;
  vencimento: string;
  totalParcelas: number;
  parcela: number;
  valor: number | string;
  valorLiquido: number | string;
  taxa: number | string;
}

export interface RedeTransformedMovement {
  sales: RedeCardTransformedMovement[];
  parc: RedeParcTransformedMovement[];
}
