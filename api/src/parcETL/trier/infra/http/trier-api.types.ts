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
