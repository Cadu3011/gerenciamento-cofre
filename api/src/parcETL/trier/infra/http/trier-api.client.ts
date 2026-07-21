import { MoveParcExtracted, EstornoResponse } from './trier-api.types';

export class TrierApiClient {
  async getParcelasCartao(
    date: string,
    tokenLocalTrier: string,
    urlLocalTrier: string,
  ): Promise<MoveParcExtracted[]> {
    const res = await fetch(
      `http://${urlLocalTrier}:4647/sgfpod1/rest/integracao/parcelas-cartao/obter-todos-v1?primeiroRegistro=0&dataEmissaoInicial=${date}&dataEmissaoFinal=${date}`,
      { headers: { Authorization: `Bearer ${tokenLocalTrier}` } },
    );
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const pc = await res.json();
    const transacoes: MoveParcExtracted[] = pc.transacoes.map((t) => {
      const newT: MoveParcExtracted = {
        filialId: pc.codigoLoja,
        ...t,
      };
      return newT;
    });

    return transacoes;
  }

  async getEstornos(
    date: string,
    tokenLocalTrier: string,
    urlLocalTrier: string,
  ): Promise<EstornoResponse> {
    const res = await fetch(
      `http://${urlLocalTrier}:4647/sgfpod1/rest/integracao/parcelas-cartao/estorno-v1?primeiroRegistro=0&dataEmissaoInicial=${date}&dataEmissaoFinal=${date}`,
      { headers: { Authorization: `Bearer ${tokenLocalTrier}` } },
    );
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  }
}
