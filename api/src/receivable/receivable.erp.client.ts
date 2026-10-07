import { Injectable } from '@nestjs/common';

/**
 * Categoria de "Recebimento Cartões" no financeiro do Trier.
 *
 * Mesmo id de `ReceivableTrierService.CATEGORIA_RECEBIMENTO` — é a categoria
 * em que os recebíveis são lançados pelo `POST /financeiro/movimentacoes`, e
 * por ela que o `/filtrar` separa deles dos demais lançamentos da data.
 */
export const CATEGORIA_RECEBIMENTO = 98;

/**
 * Teto de páginas por consulta.
 *
 * O `/filtrar` pagina como Spring Data (`page`/`size`). Sem teto, uma data com
 * poucos lançamentos e `size` errado rodaria a página infinitamente.
 */
const MAX_PAGES = 20;

/** Tamanho de página do `/filtrar`. */
const PAGE_SIZE = 200;

export type MovimentoNormalizado = {
  id: number;
  /** Status cru do ERP, guardado para o log. */
  status: string;
  efetivado: boolean;
  /** Valor que de fato caiu no extrato. `null` quando ainda não houve baixa. */
  valorBaixa: number | null;
  /** Veio do `GET /detalhar/{id}` e não da lista do `/filtrar`. */
  viaDetalhe: boolean;
};

function paraNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/**
 * Lê um lançamento devolvido pelo ERP.
 *
 * Só precisamos de dois campos: `status` e `valorBaixa`. Os dois já são
 * enviados por `MoveTrier.createDesp` (`status: 'EFETIVADO'`, `dataBaixa`,
 * `valorBaixa`), enquanto o recebível entra pelo mesmo endpoint com
 * `status: 'NAO_EFETIVADO'` e sem baixa. Ou seja: a baixa é o que muda o
 * lançamento de previsto para efetivado, e `valorBaixa` é o valor que de fato
 * caiu no extrato — é o que compara com `Receivable.valorEsperado`.
 *
 * `status` volta vazio quando o objeto não traz o campo. A lista do `/filtrar`
 * tem shape próprio e nunca foi lida no código além do `id`, então o chamador
 * precisa tratar esse caso (ver `ReceivableConciliacaoService`).
 */
export function normalizarMovimento(raw: any): MovimentoNormalizado | null {
  const id = paraNumero(raw?.id);
  if (id == null) return null;

  const status = String(raw?.status ?? '')
    .trim()
    .toUpperCase();

  return {
    id,
    status,
    efetivado: status === 'EFETIVADO',
    valorBaixa: paraNumero(raw?.valorBaixa),
    viaDetalhe: false,
  };
}

/**
 * Leitor do financeiro do Trier.
 *
 * Só dois métodos, e ambos são GET embora o de busca seja POST — o ERP expõe
 * a busca como `POST /movimentacoes/filtrar` (`create-move-trier.service.ts:240`
 * já usa assim em `getVendasTotais`).
 *
 * A rota `GET /movimentacoes/{id}` existe no código só como `DELETE`
 * (`create-move-trier.service.ts:177`), então não é usada aqui. Por isso a
 * leitura é feita em duas fases: uma chamada por data no `/filtrar` para pegar
 * todos os lançamentos de recebimento daquele dia, e o `/detalhar/{id}` apenas
 * para os poucos que a lista devolver sem `status`.
 */
@Injectable()
export class ReceivableErpClient {
  // Mesmo host de `ReceivableTrierService`, que cria os lançamentos.
  private readonly urlTrier = '192.168.1.253';

  private headers(token: string, comJson: boolean): Headers {
    const headers = new Headers();
    headers.append('Accept', 'application/json, text/plain, */*');
    headers.append('Accept-Language', 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7');
    headers.append('Authorization', `Bearer ${token}`);
    headers.append('Connection', 'keep-alive');
    if (comJson) headers.append('Content-Type', 'application/json');
    headers.append('Origin', `http://${this.urlTrier}:4647`);
    headers.append('Referer', `http://${this.urlTrier}:4647/web-drogaria-app/`);
    headers.append(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    );
    return headers;
  }

  /**
   * Todos os lançamentos da categoria de recebimento de uma data.
   *
   * O corpo replica o de `MoveTrier.getVendasTotais`, que já funciona, só que
   * filtrando pela categoria 98 em vez das 61/66 de vendas.
   *
   * `descricao` é omitido de propósito: o código do ERP manda `{id, descricao}`
   * nas duas categorias de venda, mas o nome da 98 não está em lugar nenhum do
   * repositório, e um `descricao` errado tem mais chance de derrubar o filtro
   * do que ajudar. Se o ERP reclamar, é o primeiro campo a preencher.
   */
  async listarPorData(data: string, token: string): Promise<any[]> {
    const url = `http://${this.urlTrier}:4647/web-drogaria/financeiro/movimentacoes/filtrar`;

    const body = JSON.stringify({
      customFilters: {
        customFilters: [
          {
            attribute: 'categoria',
            operator: 'IN',
            values: [{ id: CATEGORIA_RECEBIMENTO }],
            fieldType: 'MULTISELECT',
          },
        ],
      },
      dataInicio: `${data}T03:00:00.000Z `,
      dataFim: `${data}T23:59:59.999Z `,
    });

    const linhas: any[] = [];

    for (let page = 0; page < MAX_PAGES; page++) {
      const resp = await fetch(`${url}?page=${page}&size=${PAGE_SIZE}`, {
        method: 'POST',
        headers: this.headers(token, true),
        body,
        redirect: 'follow',
      });

      if (!resp.ok) {
        throw new Error(
          `ERP /movimentacoes/filtrar devolveu ${resp.status} para ${data}`,
        );
      }

      const json = await resp.json();
      const content: any[] = Array.isArray(json?.content) ? json.content : [];

      linhas.push(...content);

      // Última página: o Spring Data devolve menos que o tamanho pedido.
      if (content.length < PAGE_SIZE) break;
    }

    return linhas;
  }

  /**
   * Detalhe de um lançamento.
   *
   * Só é chamado quando a lista não trouxe `status`. Devolve o corpo bruto:
   * o formato é `{ movimentacao, detalhes }` e o que nos interessa fica em
   * `movimentacao` (`movement.service.ts:180` lê `movimentacao.filial`).
   * `null` quando o id não existe — já é a resposta, não é erro.
   */
  async detalhar(id: number, token: string): Promise<any | null> {
    const resp = await fetch(
      `http://${this.urlTrier}:4647/web-drogaria/financeiro/movimentacoes/detalhar/${id}`,
      { headers: this.headers(token, false), redirect: 'follow' },
    );

    if (!resp.ok) {
      if (resp.status === 404) return null;
      throw new Error(
        `ERP /movimentacoes/detalhar/${id} devolveu ${resp.status}`,
      );
    }

    return resp.json();
  }
}
