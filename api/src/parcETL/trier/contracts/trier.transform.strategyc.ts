import { Decimal } from '@prisma/client/runtime/library';
import { MoveParcExtracted } from '../infra/http/trier-api.types';
import { JobExecutionContext } from 'src/jobs/jobs.execContext.service';

export interface TrierTransformStrategy<TOut = unknown> {
  readonly key: string;
  execute(
    ctx: MoveParcExtracted[],
    context: JobExecutionContext,
  ): Promise<TOut[]>;
}

export interface TrierParcTransformedMovement {
  vendaId: number;
  idempotencyKey: string;
  documentoFiscal: number;
  valor: Decimal;
  valorLiquido: Decimal;
  modalidadeVenda: string | null;
  filialId: number;
  bandeira: string;
  dataEmissao: Date;
  dataVencimento: Date;
  dataPagamento: Date | null;
  nsuAdministradora: string;
  administradoraCartao: string;
  totalParcelas: number;
  parcela: number;
  valorTaxas: Decimal;
  prazoVenda: string;
}
