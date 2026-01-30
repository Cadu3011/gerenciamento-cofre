export interface TransacoesResponseItem {
  id: string;
  codigoCartao: number;
  documentoFiscal: number;
  prazoVenda: string;
  valorTotal: number | string;
  modalidadeVenda: string | null;
  nomeCartao: string | null;
}
export interface ParcelasResponse {
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
  numeroNotaOrigem: number | string;
  horaEmissao: string;
  dataEmissao: string;
  codFilial: number;
  condicaoPagamento: { codigo: number };
  itens: DevolucaoResponseItem[];
}
export type DevolucoesResponse = DevolucaoResponse[];
