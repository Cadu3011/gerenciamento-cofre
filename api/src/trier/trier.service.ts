import { Inject, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { authTrier } from 'src/auth/authTrier/loginTrier';
import { PrismaService } from 'src/database/prisma.service';

interface DiferencaCaixaDataDto {
  data: Date;
  caixa?: string;
  operador?: string;
  diferenca?: Decimal;
  filialId: number;
  sobra?: Decimal;
  falta?: Decimal;
  total_vendas_dinheiro: Decimal;
  valor_recebido: Decimal;
  idempotencyKey: string;
}

@Injectable()
export class TrierService {
  @Inject()
  private readonly prisma: PrismaService;
  //apagar esses dois metodos , são da versao anterior dos cartôes
  async findSalesTotals(
    urlLocalTrier: string,
    tokenLocalTrier: string,
    startDate: string,
    endDate: string,
  ) {
    const [resVendas, resDev] = await Promise.all([
      fetch(
        `http://${urlLocalTrier}:4647/sgfpod1/rest/integracao/parcelas-cartao/obter-todos-v1?primeiroRegistro=0&dataEmissaoInicial=${startDate}&dataEmissaoFinal=${endDate}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${tokenLocalTrier}` },
        },
      ),
      fetch(
        `http://${urlLocalTrier}:4647/sgfpod1/rest/integracao/venda/cancelamento/obter-todos-v1?primeiroRegistro=0&quantidadeRegistros=999&dataEmissaoInicial=${startDate}&dataEmissaoFinal=${endDate}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${tokenLocalTrier}` },
        },
      ),
    ]);

    const totalsSales = await resVendas.json();
    const totalsDev = await resDev.json();

    // === Agrupar totais por data ===
    const dailyTotals: Record<string, Decimal> = {};

    // --- Agrupar por documentoFiscal ---
    const grupos = new Map<string, any[]>();
    for (const t of totalsSales.transacoes) {
      if (t.codigoCartao === 34) continue;
      const documento =
        t.documentoFiscal ?? `__sem_doc__:${t.id ?? Math.random()}`;
      if (!grupos.has(documento)) grupos.set(documento, []);
      grupos.get(documento)!.push(t);
    }

    // --- Processar cada grupo ---
    for (const [documento, regs] of grupos.entries()) {
      let parceladoContado = false;

      for (const t of regs) {
        const data = (t.dataEmissao || '').split('T')[0] || startDate;
        if (!dailyTotals[data]) dailyTotals[data] = new Decimal(0);

        if (t.prazoVenda === 'PARCELADO') {
          // Se ainda não contou um parcelado deste documento, soma uma vez
          if (!parceladoContado) {
            dailyTotals[data] = dailyTotals[data].plus(
              new Decimal(t.valorTotal),
            );
            parceladoContado = true;
          }
        } else {
          // Outras modalidades somam normalmente
          dailyTotals[data] = dailyTotals[data].plus(new Decimal(t.valorTotal));
        }
      }
    }

    // --- Devoluções ---
    for (const dev of totalsDev) {
      if (dev.condicaoPagamento.codigo === 6) {
        const data = dev.dataEmissao.split('T')[0];
        const totalItens = dev.itens.reduce((subAcc, t) => {
          return subAcc.plus(new Decimal(t.valorTotalLiquido));
        }, new Decimal(0));

        if (!dailyTotals[data]) dailyTotals[data] = new Decimal(0);
        dailyTotals[data] = dailyTotals[data].minus(totalItens);
      }
    }

    // === Converter para array legível ===
    const result = Object.entries(dailyTotals)
      .map(([data, total]) => ({
        data,
        total: total.toNumber(), // ou total.toFixed(2)
      }))
      .sort((a, b) => a.data.localeCompare(b.data));

    return result;
  }

  async findSalesDetails(
    urlLocalTrier: string,
    tokenLocalTrier: string,
    date: string,
  ) {
    const headers = { Authorization: `Bearer ${tokenLocalTrier}` };

    const [resVendas, resDev, resParcelas] = await Promise.all([
      fetch(
        `http://${urlLocalTrier}:4647/sgfpod1/rest/integracao/venda/obter-todos-v1?primeiroRegistro=0&quantidadeRegistros=999&dataEmissaoInicial=${date}&dataEmissaoFinal=${date}`,
        { headers },
      ),
      fetch(
        `http://${urlLocalTrier}:4647/sgfpod1/rest/integracao/venda/cancelamento/obter-todos-v1?primeiroRegistro=0&quantidadeRegistros=999&dataEmissaoInicial=${date}&dataEmissaoFinal=${date}`,
        { headers },
      ),
      fetch(
        `http://${urlLocalTrier}:4647/sgfpod1/rest/integracao/parcelas-cartao/obter-todos-v1?primeiroRegistro=0&dataEmissaoInicial=${date}&dataEmissaoFinal=${date}`,
        { headers },
      ),
    ]);

    const [vendas, devolucoes, vendasParcela] = await Promise.all([
      resVendas.json(),
      resDev.json(),
      resParcelas.json(),
    ]);

    // --- Vendas e devoluções formatadas ---
    const vendasFormat = vendas.map((venda) => {
      const idVenda = venda.numeroNota;
      const hora = venda.horaEmissao.split('-')[0];
      const valor = venda.itens.reduce(
        (acc, t) => acc.plus(new Decimal(t.valorTotalLiquido)),
        new Decimal(0),
      );
      return { idVenda, hora, valor };
    });

    const devFormat = devolucoes
      .filter(
        (dev) =>
          dev.condicaoPagamento.codigo === 6 ||
          dev.condicaoPagamento.codigo === 8,
      )
      .map((dev) => {
        const idDev = dev.numeroNotaOrigem;
        const hora = dev.horaEmissao.split('-')[0];
        const valor = dev.itens.reduce(
          (acc, t) => acc.plus(new Decimal(t.valorTotalLiquido).mul(-1)),
          new Decimal(0),
        );
        return { idVenda: idDev, hora, valor };
      });

    const vendasMenosDevs = [...vendasFormat, ...devFormat];

    // --- Agrupar parcelas por documento fiscal ---
    const grupos = new Map<string, any[]>();
    for (const t of vendasParcela.transacoes) {
      if (t.codigoCartao === 34) continue;
      const documento =
        t.documentoFiscal ?? `__sem_doc__:${t.id ?? Math.random()}`;
      if (!grupos.has(documento)) grupos.set(documento, []);
      grupos.get(documento)!.push(t);
    }

    // --- Calcular valor total por documento ---
    const listaVendas = [];
    for (const [documento, regs] of grupos.entries()) {
      let parceladoContado = false;
      let total = new Decimal(0);

      for (const t of regs) {
        if (t.prazoVenda === 'PARCELADO') {
          if (!parceladoContado) {
            total = total.plus(new Decimal(t.valorTotal));
            parceladoContado = true;
          }
        } else {
          total = total.plus(new Decimal(t.valorTotal));
        }
      }
      const primeira = regs[0];

      listaVendas.push({
        documentoFiscal: documento,
        valorTotal: total,
        modalidade: primeira?.modalidadeVenda ?? null,
        bandeira: primeira?.nomeCartao ?? null,
      });
    }

    // --- Unir com vendasMenosDevs (adicionando hora) ---
    const listaFinalVendasCartao = listaVendas.map((vendaParc) => {
      const match = vendasMenosDevs.find(
        (v) => String(v.idVenda) === String(vendaParc.documentoFiscal),
      );
      return {
        idVenda: vendaParc.documentoFiscal,
        valor: vendaParc.valorTotal,
        hora: match?.hora ?? null,
        modalidade: vendaParc.modalidade,
        bandeira: vendaParc.bandeira,
      };
    });
    const listaDevolucoes = devFormat.map((dev) => ({
      idVenda: dev.idVenda,
      valor: dev.valor,
      hora: dev.hora,
      modalidade: 'DEVOLUCAO',
      bandeira: null,
      tipo: 'DEVOLUCAO',
    }));

    const resultado = [...listaFinalVendasCartao, ...listaDevolucoes].sort(
      (a, b) => {
        if (!a.hora) return 1;
        if (!b.hora) return -1;
        return a.hora.localeCompare(b.hora);
      },
    );
    return resultado;
  }

  async getSellersTrier(filialId: number, caixa: number) {
    const filial = await this.prisma.filial.findUnique({
      where: { id: filialId },
    });
    const token = await authTrier(
      { login: '95', password: 'cadu3011' },
      filial.urlLocalTrier,
      filialId,
    );
    const docSales = await this.prisma.salesDin.findMany({
      where: { numCaixa: caixa, filialId, tipo: 'REC_VENDA' },
    });
    /*{
     const resSale = await fetch(
      `http://${filial.urlLocalTrier}:4647/sgfpod1/rest/integracao/venda/obter-v1?primeiroRegistro=0&quantidadeRegistros=1&numeroNota=${docSale.numNota}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const sellerId = (await resSale.json())[0].codigoVendedor;
    }*/

    // 1. Buscar vendas na Trier em paralelo
    const vendasTrier = await Promise.all(
      docSales.map(async (sale) => {
        const res = await fetch(
          `http://${filial.urlLocalTrier}:4647/sgfpod1/rest/integracao/venda/obter-v1?primeiroRegistro=0&quantidadeRegistros=1&numeroNota=${sale.numNota}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await res.json();
        return data[0]?.codigoVendedor;
      }),
    );

    // 2. Filtrar códigos válidos
    const sellers = vendasTrier.filter(Boolean);

    // 3. Contar frequência
    const countMap: Record<string, number> = {};

    for (const seller of sellers) {
      countMap[seller] = (countMap[seller] || 0) + 1;
    }

    // 4. Encontrar o mais frequente
    const mostFrequentSellerId = Object.entries(countMap).reduce(
      (prev, curr) => (curr[1] > prev[1] ? curr : prev),
      ['', 0],
    )[0];

    if (!mostFrequentSellerId) {
      throw new Error('Nenhum vendedor encontrado');
    }

    const resSeller = await fetch(
      `http://${filial.urlLocalTrier}:4647/sgfpod1/rest/integracao/vendedor/obter-v1?primeiroRegistro=0&quantidadeRegistros=1&codigo=${mostFrequentSellerId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const sellerName = (await resSeller.json())[0].nome;
    return sellerName;
  }

  async createDifCaixa(data: DiferencaCaixaDataDto) {
    const { filialId, ...restData } = data;
    const operadorJaExiste = await this.prisma.diferencaCaixa.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
      select: { operador: true },
    });
    const operador = !operadorJaExiste
      ? await this.getSellersTrier(filialId, Number(data.caixa))
      : operadorJaExiste.operador;

    return await this.prisma.diferencaCaixa.upsert({
      where: { idempotencyKey: data.idempotencyKey },
      update: {
        ...restData,
        operador,
        data: new Date(data.data),
        filial: { connect: { id: filialId } },
      },
      create: {
        ...restData,
        operador,
        data: new Date(data.data),
        filial: { connect: { id: filialId } },
      },
    });
  }

  async getCaixas(initDate: string, finalDate: string, filialId: number) {
    const caixas = await this.prisma.diferencaCaixa.findMany({
      where: {
        data: { gte: new Date(initDate), lte: new Date(finalDate) },
        filial: { id: filialId },
      },
      orderBy: { caixa: 'asc' },
    });
    return caixas.map((caixa) => ({
      ...caixa,
      id: caixa.id?.toString(),
    }));
  }

  async caixasObsConf(obs: string, id: number) {
    return await this.prisma.diferencaCaixa.update({
      where: { id },
      data: { obsConf: obs },
    });
  }
}
