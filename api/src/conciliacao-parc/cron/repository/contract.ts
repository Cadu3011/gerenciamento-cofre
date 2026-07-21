import { $Enums, Prisma } from '@prisma/client';

export interface Trier {
  id: number;
  idempotencyKey: string;
  filialId: number;
  documentoFiscal: number;
  tipo: string;
  nsuAdministradora: string;
  modalidadeVenda: string;
  prazoVenda: string;
  parcela: number;
  totalParcelas: number;
  dataEmissao: Date;
  dataVencimento: Date;
  dataPagamento: Date;
  valor: Prisma.Decimal;
  valorTaxas: Prisma.Decimal;
  valorLiquido: Prisma.Decimal;
  administradoraCartao: string | null;
  bandeira: string | null;
  vendaId: number | null;
  statusConciliacao: $Enums.ParcelStatus;
  createdAt: Date;
}

export interface Rede {
  createdAt: Date;
  id: number;
  idempotencyKey: string;
  valor: Prisma.Decimal;
  filialId: number;
  statusConciliacao: $Enums.ParcelStatus;
  nsu: string;
  valorLiquido: Prisma.Decimal;
  dataVenda: Date;
  parcela: number;
  totalParcelas: number;
  vendaId: number | null;
  vencimento: Date;
  taxa: Prisma.Decimal;
}

export interface Cielo {
  createdAt: Date;
  id: number;
  idempotencyKey: string;
  valor: Prisma.Decimal;
  modalidade: string | null;
  filialId: number;
  bandeira: string | null;
  dataVencimento: Date;
  statusConciliacao: $Enums.ParcelStatus;
  nsu: string | null;
  valorLiquido: Prisma.Decimal;
  dataVenda: Date;
  taxaAdministrativa: Prisma.Decimal;
  codigoAutorizacao: string | null;
  codigoTransacao: string;
  parcela: number;
  totalParcelas: number;
  vendaId: number | null;
}

export interface VendaIndex {
  trier: Map<number, number>;
  rede: Map<number, number>;
  cielo: Map<number, number>;
}

export interface Data {
  trier: Trier[];
  rede: Rede[];
  cielo: Cielo[];
  conciliacoesVenda?: any[];
}

export type ParcelaFonte =
  | { origem: 'TRIER'; parcela: Trier }
  | { origem: 'REDE'; parcela: Rede }
  | { origem: 'CIELO'; parcela: Cielo };

export interface ConciliacaoGrupoItem {
  redeParcelaId?: number;
  cieloParcelaId?: number;
  tipoMatch: $Enums.MatchType;
  divergenciaValor: boolean;
  divergenciaVencimento: boolean;
  divergenciaValorLiquido: boolean;
  divergenciaParcelas: boolean;
  divergenciaModalidade: boolean;
  divergenciaBandeira: boolean;
}

export interface ConciliacaoGrupo {
  trierIds: number[];
  status: $Enums.ParcelStatus;
  tipoMatch: $Enums.MatchType;
  observacao?: string;
  itens: ConciliacaoGrupoItem[];
}
