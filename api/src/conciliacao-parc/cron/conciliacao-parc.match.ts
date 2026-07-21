import { Injectable } from '@nestjs/common';
import { Cielo, Data, Rede, Trier, VendaIndex } from './repository/contract';
import { MatchType, ParcelStatus, Prisma } from '@prisma/client';

@Injectable()
export class ConciliacaoParcMatch {
  private createVendaIndex(
    conciliacoes: {
      itens: {
        trierId: number | null;
        redeId: number | null;
        cieloId: number | null;
      }[];
    }[],
  ): VendaIndex {
    const trier = new Map<number, number>();
    const rede = new Map<number, number>();
    const cielo = new Map<number, number>();

    conciliacoes.forEach((grupo, index) => {
      grupo.itens.forEach((item) => {
        if (item.trierId) trier.set(item.trierId, index);

        if (item.redeId) rede.set(item.redeId, index);

        if (item.cieloId) cielo.set(item.cieloId, index);
      });
    });

    return {
      trier,
      rede,
      cielo,
    };
  }

  private score(trier: Trier, outra: Rede | Cielo, vendasIndex: VendaIndex) {
    let score = 0;
    let tipoMatch: MatchType = MatchType.VALOR;

    const grupoTrier = vendasIndex.trier.get(trier.vendaId!);

    const grupoOutra = 'nsu' in outra && vendasIndex.rede.get(outra.vendaId!);

    if (
      grupoTrier !== undefined &&
      grupoOutra !== undefined &&
      grupoTrier === grupoOutra
    ) {
      score += 500;
      tipoMatch = MatchType.VENDA_CONCILIADA;
    }

    // NSU
    if (
      'nsu' in outra &&
      trier.nsuAdministradora &&
      outra.nsu &&
      trier.nsuAdministradora === outra.nsu
    ) {
      score += 100;
      tipoMatch = MatchType.NSU;
    }

    // Valor
    if (Number(trier.valor) === Number(outra.valor)) {
      score += 50;

      if (
        tipoMatch !== MatchType.NSU &&
        tipoMatch !== MatchType.VENDA_CONCILIADA
      ) {
        tipoMatch = MatchType.VALOR;
      }
    }

    // Parcela
    if (
      trier.parcela === outra.parcela &&
      trier.totalParcelas === outra.totalParcelas
    ) {
      score += 20;
    }

    // Data
    const dataOutra =
      'vencimento' in outra ? outra.vencimento : outra.dataVencimento;

    if (trier.dataVencimento.getTime() === dataOutra.getTime()) {
      score += 10;

      if (tipoMatch === MatchType.VALOR) {
        tipoMatch = MatchType.VALOR_DATA;
      }
    }

    return {
      score,
      tipoMatch,
    };
  }

  private findBestMatch(
    trier: Trier,
    lista: (Rede | Cielo)[],
    usados: Set<number>,
    vendasIndex: VendaIndex,
  ) {
    let melhor = null;
    let melhorIndex = -1;
    let maiorScore = 0;
    let tipoMatch: MatchType = MatchType.VALOR;

    lista.forEach((item, index) => {
      if (usados.has(index)) return;

      const result = this.score(trier, item, vendasIndex);

      if (result.score > maiorScore) {
        maiorScore = result.score;
        melhor = item;
        melhorIndex = index;
        tipoMatch = result.tipoMatch;
      }
    });

    if (melhorIndex >= 0) {
      usados.add(melhorIndex);
    }

    return melhor
      ? {
          parcela: melhor,
          tipoMatch,
        }
      : null;
  }

  private buildConciliacao(
    trier: Trier,
    match?: {
      parcela: Rede | Cielo;
      tipoMatch: MatchType;
    },
  ): Prisma.ConciliacaoParcelaCreateManyInput {
    if (!match) {
      return {
        trierParcelaId: trier.id,

        status: ParcelStatus.DIVERGENTE,

        tipoMatch: MatchType.VALOR,

        divergenciaValor: true,
        divergenciaVencimento: true,

        divergenciaValorLiquido: false,
        divergenciaParcelas: false,
        divergenciaModalidade: false,
        divergenciaBandeira: false,

        observacao: 'Nenhuma parcela correspondente encontrada',
      };
    }

    const outra = match.parcela;

    const divergenciaValor = Number(trier.valor) !== Number(outra.valor);

    const valorLiquidoOutra = outra.valorLiquido;

    const divergenciaValorLiquido =
      Number(trier.valorLiquido) !== Number(valorLiquidoOutra);

    const dataOutra =
      'vencimento' in outra ? outra.vencimento : outra.dataVencimento;

    const divergenciaVencimento =
      trier.dataVencimento.getTime() !== dataOutra.getTime();

    const divergenciaParcelas =
      trier.parcela !== outra.parcela ||
      trier.totalParcelas !== outra.totalParcelas;

    const divergenciaModalidade =
      'modalidade' in outra &&
      !!trier.modalidadeVenda &&
      !!outra.modalidade &&
      trier.modalidadeVenda !== outra.modalidade;

    const divergenciaBandeira =
      'bandeira' in outra &&
      !!trier.bandeira &&
      !!outra.bandeira &&
      trier.bandeira !== outra.bandeira;

    const temDivergencia =
      divergenciaValor ||
      divergenciaValorLiquido ||
      divergenciaVencimento ||
      divergenciaParcelas ||
      divergenciaModalidade ||
      divergenciaBandeira;

    return {
      trierParcelaId: trier.id,

      redeParcelaId: 'nsu' in outra ? outra.id : null,

      cieloParcelaId: 'codigoTransacao' in outra ? outra.id : null,

      status: temDivergencia
        ? ParcelStatus.DIVERGENTE
        : ParcelStatus.CONCILIADO,

      tipoMatch: match.tipoMatch,

      divergenciaValor,

      divergenciaValorLiquido,

      divergenciaVencimento,

      divergenciaParcelas,

      divergenciaModalidade,

      divergenciaBandeira,
    };
  }

  match(moves: Data) {
    const redeUsados = new Set<number>();
    const cieloUsados = new Set<number>();
    const vendasIndex = this.createVendaIndex(moves.conciliacoesVenda);
    const grupos: Prisma.ConciliacaoParcelaCreateManyInput[] = [];

    for (const trier of moves.trier) {
      let candidato = this.findBestMatch(
        trier,
        moves.rede,
        redeUsados,
        vendasIndex,
      );

      if (!candidato) {
        candidato = this.findBestMatch(
          trier,
          moves.cielo,
          cieloUsados,
          vendasIndex,
        );
      }

      grupos.push(this.buildConciliacao(trier, candidato));
    }

    return grupos;
  }
}
