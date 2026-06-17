export interface TransacoesResponseItem {
  id: string;
  codigoCartao: number;
  documentoFiscal: number;
  idTransacao: string;
  prazoVenda: string;
  valorTotal: number | string;
  modalidadeVenda: string | null;
  nomeCartao: string | null;
  dataVencimeno: string;
  dataPagamento: string | null;
}
export interface ParcelasResponse {
  codigoLoja: number;
  transacoes: TransacoesResponseItem[];
}

export interface VendaResponseItem {
  valorTotalLiquido: number | string;
}
export interface VendaResponse {
  numeroNota: number | string;
  horaEmissao: string;
  dataEmissao: string;
  codFilial: number;
  itens: VendaResponseItem[];
  condicaoPagamento: { codigo: number };
}
export type VendasResponse = VendaResponse[];

export interface DevolucaoResponseItem {
  valorTotalLiquido: number | string;
}

export interface DevolucaoResponse {
  numeroNota: number | string;
  numeroNotaOrigem: number | string;
  horaEmissao: string;
  dataEmissao: string;
  codFilial: number;
  condicaoPagamento: { codigo: number };
  itens: DevolucaoResponseItem[];
}
export type DevolucoesResponse = DevolucaoResponse[];
