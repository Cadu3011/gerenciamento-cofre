export interface ParcTrier {
  id: number;
  documentoFiscal: number | null;
  nsuAdministradora: string | null;
  modalidadeVenda: string | null;
  bandeira: string | null;
  parcela: number;
  totalParcelas: number;
  dataEmissao: string;
  dataVencimento: string;
  valor: string;
  valorLiquido: string;
  taxa: string;
  statusConciliacao: string;
}

export interface ParcOutra {
  origem: "REDE" | "CIELO";
  id: number;
  nsu: string | null;
  parcela: number;
  totalParcelas: number;
  dataVenda: string;
  vencimento?: string;
  dataVencimento?: string;
  valor: string;
  valorLiquido: string;
  taxa: string;
  statusConciliacao: string;
  codigoTransacao?: string;
  modalidade?: string;
  bandeira?: string;
}

export interface ConciliacaoParcItemItem {
  id: number;
  tipoMatch: string | null;
  divergenciaValor: boolean;
  divergenciaVencimento: boolean;
  divergenciaValorLiquido: boolean;
  divergenciaParcelas: boolean;
  outra: ParcOutra | null;
}

export interface ConciliacaoParcItem {
  id: number;
  status: string;
  tipoMatch: string | null;
  observacao: string | null;
  createdAt: string;
  triers: ParcTrier[];
  itens: ConciliacaoParcItemItem[];
}

export interface TotalsParcDay {
  data: string;
  conciliados: number;
  divergentes: number;
  naoEncontrados: number;
  totalValor: number;
  totalValorLiquido: number;
  totalTaxas: number;
}

export interface FlatRow {
  groupId: number;
  groupStatus: string;
  tipoMatch: string | null;
  origem: "TRIER" | "REDE" | "CIELO";
  nsu: string | null;
  parcela: number;
  totalParcelas: number;
  modalidade: string | null;
  bandeira: string | null;
  valor: string;
  valorLiquido: string;
  taxa: string;
  vencimento: string;
  documentoFiscal?: number | null;
  divergenciaValor: boolean;
  divergenciaVencimento: boolean;
  divergenciaValorLiquido: boolean;
  divergenciaParcelas: boolean;
}
