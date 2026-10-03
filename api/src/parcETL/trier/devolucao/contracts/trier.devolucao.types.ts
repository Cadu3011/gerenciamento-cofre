/**
 * Estorno de devolução lido da origem (`parcelas-cartao/estorno-v1`).
 *
 * A origem entrega `numeroNotaOrigem` e `dataEmissaoOrigem` — a nota e a data
 * da venda que foi cancelada. É esse par que torna a devolução rastreável,
 * já que o estorno em si não carrega bandeira.
 */
export type DevolucaoExtracted = {
  filialId: number;
  numeroNotaDevolucao: number;
  dataEmissaoDevolucao: string;
  totalNotaDevolucao: number;
  numeroNotaOrigem: number;
  dataEmissaoOrigem: string;
  totalNotaOrigem: number;
};

/** Estorno com a bandeira da venda original já resolvida. */
export type DevolucaoTransformada = {
  filialId: number;

  /** Nota da PRÓPRIA devolução — identificador único do registro. */
  documentoFiscal: number;
  /** Nota da venda original. É o elo com a venda cancelada. */
  documentoFiscalEstorno: number;

  dataEmissao: string;
  dataVencimento: string;

  valor: number;
  valorLiquido: number;
  valorTaxas: number;

  /**
   * Bandeira herdada da venda original. Vazio quando a venda não pôde ser
   * localizada — nesses casos o registro entra assim mesmo e o job reporta
   * o total sem resolver, para não perder a devolução do dashboard.
   */
  bandeira: string;

  nsuAdministradora: string;
  prazoVenda: string;
  modalidadeVenda: string | null;
  administradoraCartao: string;
  parcela: number;
  totalParcelas: number;
};

export type DevolucaoTransformResult = {
  linhas: DevolucaoTransformada[];
  /** Estornos cuja venda original não foi localizada em nenhum dos caminhos. */
  naoResolvidas: {
    documentoDevolucao: number;
    numeroNotaOrigem: number;
    dataEmissaoOrigem: string;
    valor: number;
  }[];
  /** Quantas chamadas extras à origem foram necessárias. */
  chamadasOrigem: number;
};
