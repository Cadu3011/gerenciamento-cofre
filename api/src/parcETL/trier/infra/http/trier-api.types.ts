export interface MoveParcExtracted {
  filialId: number;
  codigoCartao: number;
  documentoFiscal: number;
  idTransacao: string;
  prazoVenda: string;
  valorParcela: number | string;
  modalidadeVenda: string | null;
  nomeCartao: string | null;
  dataVencimento: string;
  dataPagamento: string | null;
  nsuAdministradora: string;
  dataEmissao: string;
  administradoraCartao: string;
  totalParcelas: number;
  numeroParcela: number;
  valorTaxas: number;
}

export interface EstornoItem {
  numeroNotaDevolucao: number | string;
  dataEmissaoDevolucao: string;
  totalNotaDevolucao: number | string;
  numeroNotaOrigem: number | string;
  dataEmissaoOrigem: string;
  totalNotaOrigem: number | string;
}

export interface EstornoResponse {
  codigoLoja: number;
  estornos: EstornoItem[];
}
