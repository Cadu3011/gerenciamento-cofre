import {
  DevolucoesResponse,
  ParcelasResponse,
  VendasResponse,
} from '../infra/http/trier-api.types';

export type TrierAuth = {
  date: string;
  tokenLocalTrier: string;
  urlLocalTrier: string;
};

export interface TrierExtractStrategy<TOut = unknown> {
  readonly key: string;
  execute(ctx: TrierAuth): Promise<TOut>;
}

export type MoveCardsExtracted = {
  vendas: VendasResponse;
  devolucoes: DevolucoesResponse;
  vendasParcela: ParcelasResponse;
};

type ApiError = {
  status: number;
  error: string;
  message: string;
};

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    'message' in value &&
    'status' in value &&
    typeof (value as any).status === 'number' &&
    typeof (value as any).error === 'string' &&
    typeof (value as any).message === 'string'
  );
}
