import { MoveCardsExtracted } from './trier.extract.strategy';

export interface TrierTransformStrategy<TOut = unknown> {
  readonly key: string;
  execute(ctx: MoveCardsExtracted): Promise<TOut>;
}

export interface TrierCardTransformedMovement {
  idempotencyKey: string;
  documentoFiscal: number;
  valor: number | string;
  modalidade: string | null;
  hora: string;
  tipo: string;
  filialId: number;
  bandeira: string;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento: string | null;
}
