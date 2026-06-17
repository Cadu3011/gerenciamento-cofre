import {
  DevolucoesResponse,
  ParcelasResponse,
  VendasResponse,
} from './trier-api.types';

export class TrierApiClient {
  async getParcelasCartao(
    date: string,
    tokenLocalTrier: string,
    urlLocalTrier: string,
  ): Promise<ParcelasResponse> {
    const res = await fetch(
      `http://${urlLocalTrier}:4647/sgfpod1/rest/integracao/parcelas-cartao/obter-todos-v1?primeiroRegistro=0&dataEmissaoInicial=${date}&dataEmissaoFinal=${date}`,
      { headers: { Authorization: `Bearer ${tokenLocalTrier}` } },
    );
    const pc: ParcelasResponse = await res.json();

    return pc;
  }
  async getVendas(
    date: string,
    tokenLocalTrier: string,
    urlLocalTrier: string,
  ): Promise<VendasResponse> {
    const res = await fetch(
      `http://${urlLocalTrier}:4647/sgfpod1/rest/integracao/venda/obter-todos-v1?primeiroRegistro=0&quantidadeRegistros=999&dataEmissaoInicial=${date}&dataEmissaoFinal=${date}`,
      { headers: { Authorization: `Bearer ${tokenLocalTrier}` } },
    );
    const vc: VendasResponse = await res.json();
    return vc;
  }
  async getCancelamentos(
    date: string,
    tokenLocalTrier: string,
    urlLocalTrier: string,
  ): Promise<DevolucoesResponse> {
    const res = await fetch(
      `http://${urlLocalTrier}:4647/sgfpod1/rest/integracao/venda/cancelamento/obter-todos-v1?primeiroRegistro=0&quantidadeRegistros=999&dataEmissaoInicial=${date}&dataEmissaoFinal=${date}`,
      { headers: { Authorization: `Bearer ${tokenLocalTrier}` } },
    );
    const cc: DevolucoesResponse = await res.json();
    return cc;
  }
}
