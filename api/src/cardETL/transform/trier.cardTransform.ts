import { Injectable } from '@nestjs/common';
import { MoveCardsExtracted } from '../contracts/trier.extract.strategy';
import {
  TrierCardTransformedMovement,
  TrierTransformStrategy,
} from '../contracts/trier.transform.strategyc';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TrierCardTransform implements TrierTransformStrategy {
  key: string;

  async execute(
    ctx: MoveCardsExtracted,
  ): Promise<TrierCardTransformedMovement[]> {
    /**
     * 0) INDEX DE METADATA (SEM DEPENDER DA FORMA DE PAGAMENTO)
     *    - Serve pra pegar hora/data/filial pelo documentoFiscal/numeroNota
     */
    const metaByDoc = new Map<
      string,
      { hora: string; data: string; filialId: number }
    >();

    // Todas as vendas (independente da condição de pagamento)
    for (const venda of ctx.vendas) {
      metaByDoc.set(String(venda.numeroNota), {
        hora: venda.horaEmissao?.split('-')[0] ?? '',
        data: venda.dataEmissao,
        filialId: venda.codFilial,
      });
    }

    // Devoluções: indexa pelo numeroNotaOrigem (que é o doc da venda original)
    for (const dev of ctx.devolucoes) {
      metaByDoc.set(String(dev.numeroNota), {
        hora: dev.horaEmissao?.split('-')[0] ?? '',
        data: dev.dataEmissao,
        filialId: dev.codFilial,
      });
    }

    /*
     * 0.5) BLOQUEAR CODIGO CARTAO 34
     */
    const docsCartao34 = new Set<string>();

    for (const t of ctx.vendasParcela.transacoes) {
      if (t.codigoCartao === 34) {
        const documento = t.documentoFiscal
          ? String(t.documentoFiscal)
          : String(t.idTransacao.replace('RC:', '9000'));

        docsCartao34.add(documento);
      }
    }

    /**
     * 1) DEVOLUÇÕES CARTÃO (mantém seu filtro, se você só quer devolução no cartão)
     *    - aqui continua fazendo sentido filtrar por 6/8
     */
    const devFormat = ctx.devolucoes
      .filter((dev) => {
        const ehCartao =
          dev.condicaoPagamento.codigo === 6 ||
          dev.condicaoPagamento.codigo === 8;

        const origem = String(dev.numeroNotaOrigem);

        const origemEhCartao34 = docsCartao34.has(origem);

        return ehCartao && !origemEhCartao34;
      })
      .map((dev) => {
        const idDev = dev.numeroNota;
        const origemDev = dev.numeroNotaOrigem;
        const hora = dev.horaEmissao?.split('-')[0] ?? '';
        const data = dev.dataEmissao;
        const filialId = dev.codFilial;
        const valor = dev.itens.reduce(
          (acc, t) => acc.plus(new Decimal(t.valorTotalLiquido).mul(-1)),
          new Decimal(0),
        );

        return { idVenda: idDev, hora, valor, data, filialId, origemDev };
      });

    /**
     * 2) AGRUPAR PARCELAS POR DOCUMENTO FISCAL
     */
    const grupos = new Map<string, any[]>();

    for (const t of ctx.vendasParcela.transacoes) {
      if (t.codigoCartao === 34) continue; // mantém sua regra

      // se vier sem documento, ainda agrupa por um id fallback
      const documento = t.documentoFiscal
        ? String(t.documentoFiscal)
        : String(t.idTransacao.replace('RC:', '9000'));

      if (!grupos.has(documento)) grupos.set(documento, []);
      grupos.get(documento)!.push(t);
    }

    /**
     * 3) CALCULAR VALOR TOTAL POR DOCUMENTO (com sua regra do PARCELADO)
     *    + guardar fallback de dataEmissao pela própria parcela
     */
    const listaVendas = [];
    for (const [documentoFiscal, regs] of grupos.entries()) {
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
        documentoFiscal,
        idTransacao: primeira.idTransacao,
        valorTotal: total,
        modalidade: primeira?.modalidadeVenda ?? null,
        bandeira: primeira?.nomeCartao ?? null,
        filialId: ctx.vendasParcela.codigoLoja,
        dataEmissaoParcela: primeira?.dataEmissao ?? null,
        dataVencimentoParcela: primeira.dataVencimento,
        dataPagamentoParcela: primeira.dataPagamento ?? null,
      });
    }

    /**
     * 4) GERAR VENDAS CARTÃO BASEADAS NAS PARCELAS
     *    - hora/data vem do metaByDoc (todas as vendas), não do filtro de pagamento
     */
    const listaFinalVendasCartao: TrierCardTransformedMovement[] =
      listaVendas.map((vendaParc) => {
        const meta = metaByDoc.get(String(vendaParc.documentoFiscal));

        const hora = meta?.hora ?? '00:00:00';
        const data = meta?.data ?? vendaParc.dataEmissaoParcela ?? undefined;
        const tipo = vendaParc.idTransacao.startsWith('RC:')
          ? 'RECEBIMENTO_CREDIARIO'
          : 'VENDA';
        return {
          idempotencyKey: `TRIER|${vendaParc.filialId}|${data ?? 'SEM_DATA'}|${vendaParc.documentoFiscal}|${hora ?? 'SEM_HORA'}`,
          documentoFiscal: Number(vendaParc.documentoFiscal),
          valor: String(vendaParc.valorTotal),
          hora,
          modalidade: vendaParc.modalidade,
          bandeira: vendaParc.bandeira ?? '',
          tipo,
          dataEmissao: data,
          filialId: vendaParc.filialId,
          dataVencimento: vendaParc.dataVencimentoParcela,
          dataPagamento: vendaParc.dataPagamentoParcela,
        };
      });

    /**
     * 5) DEVOLUÇÕES (como você já fazia)
     */
    const listaDevolucoes: TrierCardTransformedMovement[] = devFormat.map(
      (dev) => ({
        idempotencyKey: `TRIER|${dev.filialId}|${dev.data}|${dev.idVenda}|${dev.origemDev}|${dev.hora}`,
        documentoFiscal: Number(dev.idVenda),
        valor: String(dev.valor),
        hora: dev.hora,
        modalidade: 'DEVOLUCAO',
        bandeira: '',
        tipo: 'DEVOLUCAO',
        dataEmissao: dev.data,
        filialId: dev.filialId,
        dataVencimento: '',
        dataPagamento: null,
      }),
    );

    /**
     * 6) RESULTADO FINAL
     */
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
