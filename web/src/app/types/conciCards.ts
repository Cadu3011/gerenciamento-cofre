export interface ConciCards {
  trier: {
    id: number;
    grupoId: number;
    valor: number | string;
    hora: string;
    documentoFiscal: number;
    modalidade: string;
    bandeira: string;
    status: string;
    origem: string;
    metodo: string;
    qtdItensGrupo: { itens: number };
  }[];
  outros: {
    id: number;
    grupoId: number;
    valor: number | string;
    hora: string;
    documentoFiscal: number;
    modalidade: string;
    bandeira: string;
    status: string;
    origem: string;
    nsu: string;
    metodo: string;
    qtdItensGrupo: { itens: number };
  }[];
}

type BaseItem = {
  id: number;
  grupoId: number;
  conciliacaoId: number;
  horaNum: number;
  hora: string;
  valor: number;
  origem: "TRIER" | "CIELO" | "REDE";
  diferencaGrupo?: number | string;
  motivo?: string;
};

type TrierItem = BaseItem & {
  origem: "TRIER";
  documentoFiscal?: string;
  modalidade?: string;
  bandeira?: string;
  status?: string;
};

type CieloItem = BaseItem & {
  origem: "CIELO";
  nsu?: string;
  bandeira?: string;
  modalidade?: string;
  status?: string;
};

type RedeItem = BaseItem & {
  origem: "REDE";
  nsu?: string;
  bandeira?: string;
  modalidade?: string;
  status?: string;
};

export type ConciliacaoDivergenteItem = TrierItem | CieloItem | RedeItem;

export type ItensConciliados = TrierItem | CieloItem | RedeItem;
