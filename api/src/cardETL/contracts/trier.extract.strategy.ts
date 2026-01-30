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
