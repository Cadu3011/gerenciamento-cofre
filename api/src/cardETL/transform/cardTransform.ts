import { Inject, Injectable } from '@nestjs/common';
import { MoveCardsExtracted } from '../contracts/trier.extract.strategy';
import {
  TrierCardTransformedMovement,
  TrierTransformStrategy,
} from '../contracts/trier.transform.strategyc';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CardTransform implements TrierTransformStrategy {
  key: string;
  @Inject()
  async execute(
    ctx: MoveCardsExtracted,
  ): Promise<TrierCardTransformedMovement[]> {
    const vendasFormat = ctx.vendas
      .filter(
        (venda) =>
          venda.condicaoPagamento.codigo === 6 ||
          venda.condicaoPagamento.codigo === 8,
      )
      .map((venda) => {
        const idVenda = venda.numeroNota;
        const hora = venda.horaEmissao.split('-')[0];
        const data = venda.dataEmissao;
        const filialId = venda.codFilial;
        const valor = venda.itens.reduce(
          (acc, t) => acc.plus(new Decimal(t.valorTotalLiquido)),
          new Decimal(0),
        );
        return { idVenda, hora, valor, data, filialId };
      });

    const devFormat = ctx.devolucoes
      .filter(
        (dev) =>
          dev.condicaoPagamento.codigo === 6 ||
          dev.condicaoPagamento.codigo === 8,
      )
      .map((dev) => {
        const idDev = dev.numeroNotaOrigem;
        const hora = dev.horaEmissao.split('-')[0];
        const data = dev.dataEmissao;
        const filialId = dev.codFilial;

        const valor = dev.itens.reduce(
          (acc, t) => acc.plus(new Decimal(t.valorTotalLiquido).mul(-1)),
          new Decimal(0),
        );
        return { idVenda: idDev, hora, valor, data, filialId };
      });

    const vendasMenosDevs = [...vendasFormat, ...devFormat];

    // --- Agrupar parcelas por documento fiscal ---
    const grupos = new Map<string | number, any[]>();
    for (const t of ctx.vendasParcela.transacoes) {
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

    // --- Unir com vendasMenosDevs
    const listaFinalVendasCartao: TrierCardTransformedMovement[] =
      listaVendas.map((vendaParc) => {
        const match = vendasMenosDevs.find(
          (v) => String(v.idVenda) === String(vendaParc.documentoFiscal),
        );
        return {
          idempotencyKey: `TRIER|${vendaParc.filialId}|${match?.data}|${vendaParc.documentoFiscal}|${match?.hora}|${match?.data}`,
          documentoFiscal: vendaParc.documentoFiscal,
          valor: String(vendaParc.valorTotal),
          hora: match?.hora ?? null,
          modalidade: vendaParc.modalidade,
          bandeira: vendaParc.bandeira,
          tipo: 'VENDA',
          dataEmissao: match?.data,
          filialId: vendaParc.filialId,
        };
      });
    const listaDevolucoes: TrierCardTransformedMovement[] = devFormat.map(
      (dev) => ({
        idempotencyKey: `TRIER|${dev.filialId}|${dev.data}|${dev.idVenda}|${dev.hora}|${dev.data}`,
        documentoFiscal: Number(dev.idVenda),
        valor: String(dev.valor),
        hora: dev.hora,
        modalidade: 'DEVOLUCAO',
        bandeira: null,
        tipo: 'DEVOLUCAO',
        dataEmissao: dev.data,
        filialId: dev.filialId,
      }),
    );

    const resultado = [...listaFinalVendasCartao, ...listaDevolucoes].sort(
      (a, b) => {
        if (!a.hora) return 1;
        if (!b.hora) return -1;
        return a.hora.localeCompare(b.hora);
      },
    );
    return resultado;
  }
}
