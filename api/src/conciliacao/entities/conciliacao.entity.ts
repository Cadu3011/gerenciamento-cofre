import { Decimal } from '@prisma/client/runtime/library';

export class Conciliacao {}
export type VendaNormalizada = {
  id: number;
  idempotencyKey: string;
  valor: Decimal | null;
  modalidade: string | null;
  filialId: number;
  bandeira: string | null;
  statusConciliacao: any;
  nsu: string | null;
  valorLiquido: Decimal | null;
  status: string;
  dataVenda: Date;
  horaVenda: Date;
  origem: 'REDE' | 'CIELO';
};
