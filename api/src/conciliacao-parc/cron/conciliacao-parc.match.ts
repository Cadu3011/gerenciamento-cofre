import { Injectable } from '@nestjs/common';
import {
  Cielo,
  ConciliacaoGrupo,
  ConciliacaoGrupoItem,
  Data,
  ParcelaFonte,
  Rede,
  Trier,
  VendaIndex,
} from './repository/contract';
import { MatchType, ParcelStatus } from '@prisma/client';

class UnionFind {
  private parent: Map<string, string> = new Map();
  private rank: Map<string, number> = new Map();

  makeSet(x: string) {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
  }

  find(x: string): string {
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }

  union(x: string, y: string) {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return;
    const rankX = this.rank.get(rx)!;
    const rankY = this.rank.get(ry)!;
    if (rankX < rankY) {
      this.parent.set(rx, ry);
    } else if (rankX > rankY) {
      this.parent.set(ry, rx);
    } else {
      this.parent.set(ry, rx);
      this.rank.set(rx, rankX + 1);
    }
  }
}

@Injectable()
export class ConciliacaoParcMatch {
  private isCielo(obj: Rede | Cielo): obj is Cielo {
    return 'codigoTransacao' in obj;
  }

  private parcelKey(origem: 'TRIER' | 'REDE' | 'CIELO', id: number): string {
    return `${origem}:${id}`;
  }

  private normalizarNsu(nsu: string | null | undefined): string {
    return (nsu ?? '').replace(/^0+/, '');
  }

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

    return { trier, rede, cielo };
  }

  private agrupar(moves: Data): ParcelaFonte[][] {
    const uf = new UnionFind();
    const fontes = new Map<string, ParcelaFonte>();

    for (const t of moves.trier) {
      const key = this.parcelKey('TRIER', t.id);
      uf.makeSet(key);
      fontes.set(key, { origem: 'TRIER', parcela: t });
    }
    for (const r of moves.rede) {
      const key = this.parcelKey('REDE', r.id);
      uf.makeSet(key);
      fontes.set(key, { origem: 'REDE', parcela: r });
    }
    for (const c of moves.cielo) {
      const key = this.parcelKey('CIELO', c.id);
      uf.makeSet(key);
      fontes.set(key, { origem: 'CIELO', parcela: c });
    }

    const nsuMap = new Map<string, string[]>();

    for (const t of moves.trier) {
      const nsu = this.normalizarNsu(t.nsuAdministradora);
      if (!nsu) continue;
      const nsuKey = `${nsu}:${t.parcela}`;
      const key = this.parcelKey('TRIER', t.id);
      const list = nsuMap.get(nsuKey) ?? [];
      list.push(key);
      nsuMap.set(nsuKey, list);
    }
    for (const r of moves.rede) {
      const nsu = this.normalizarNsu(r.nsu);
      if (!nsu) continue;
      const nsuKey = `${nsu}:${r.parcela}`;
      const key = this.parcelKey('REDE', r.id);
      const list = nsuMap.get(nsuKey) ?? [];
      list.push(key);
      nsuMap.set(nsuKey, list);
    }
    for (const c of moves.cielo) {
      const nsu = this.normalizarNsu(c.nsu);
      if (!nsu) continue;
      const nsuKey = `${nsu}:${c.parcela}`;
      const key = this.parcelKey('CIELO', c.id);
      const list = nsuMap.get(nsuKey) ?? [];
      list.push(key);
      nsuMap.set(nsuKey, list);
    }

    for (const keys of nsuMap.values()) {
      for (let i = 1; i < keys.length; i++) {
        uf.union(keys[0], keys[i]);
      }
    }

    const trierVendaMap = new Map<number, string[]>();
    for (const t of moves.trier) {
      if (t.vendaId) {
        const list = trierVendaMap.get(t.vendaId) ?? [];
        list.push(this.parcelKey('TRIER', t.id));
        trierVendaMap.set(t.vendaId, list);
      }
    }
    const redeVendaMap = new Map<number, string[]>();
    for (const r of moves.rede) {
      if (r.vendaId) {
        const list = redeVendaMap.get(r.vendaId) ?? [];
        list.push(this.parcelKey('REDE', r.id));
        redeVendaMap.set(r.vendaId, list);
      }
    }
    const cieloVendaMap = new Map<number, string[]>();
    for (const c of moves.cielo) {
      if (c.vendaId) {
        const list = cieloVendaMap.get(c.vendaId) ?? [];
        list.push(this.parcelKey('CIELO', c.id));
        cieloVendaMap.set(c.vendaId, list);
      }
    }

    if (moves.conciliacoesVenda) {
      for (const conc of moves.conciliacoesVenda) {
        const keys: string[] = [];
        for (const item of conc.itens) {
          if (item.trierId) {
            const found = trierVendaMap.get(item.trierId);
            if (found) keys.push(...found);
          }
          if (item.redeId) {
            const found = redeVendaMap.get(item.redeId);
            if (found) keys.push(...found);
          }
          if (item.cieloId) {
            const found = cieloVendaMap.get(item.cieloId);
            if (found) keys.push(...found);
          }
        }
        for (let i = 1; i < keys.length; i++) {
          uf.union(keys[0], keys[i]);
        }
      }
    }

    const gruposMap = new Map<string, ParcelaFonte[]>();
    for (const [key, fonte] of fontes) {
      const root = uf.find(key);
      const grupo = gruposMap.get(root) ?? [];
      grupo.push(fonte);
      gruposMap.set(root, grupo);
    }

    return [...gruposMap.values()];
  }

  private buildItem(
    trierRef: Trier,
    outra: Rede | Cielo,
    tipoMatch: MatchType,
  ): ConciliacaoGrupoItem {
    const divergenciaValor = Number(trierRef.valor) !== Number(outra.valor);

    const divergenciaValorLiquido =
      Number(trierRef.valorLiquido) !== Number(outra.valorLiquido);

    const dataOutra =
      'vencimento' in outra ? outra.vencimento : outra.dataVencimento;
    const divergenciaVencimento =
      trierRef.dataVencimento.getTime() !== dataOutra.getTime();

    const divergenciaParcelas =
      trierRef.parcela !== outra.parcela ||
      trierRef.totalParcelas !== outra.totalParcelas;

    return {
      redeParcelaId: this.isCielo(outra) ? undefined : outra.id,
      cieloParcelaId: this.isCielo(outra) ? outra.id : undefined,
      tipoMatch,
      divergenciaValor,
      divergenciaValorLiquido,
      divergenciaVencimento,
      divergenciaParcelas,
      divergenciaModalidade: false,
      divergenciaBandeira: false,
    };
  }

  match(moves: Data): ConciliacaoGrupo[] {
    const vendasIndex = this.createVendaIndex(moves.conciliacoesVenda);
    const agrupados = this.agrupar(moves);
    const grupos: ConciliacaoGrupo[] = [];

    for (const grupo of agrupados) {
      const trierList = grupo
        .filter((f) => f.origem === 'TRIER')
        .map((f) => f.parcela as Trier);
      const redeCielo = grupo.filter(
        (f) => f.origem === 'REDE' || f.origem === 'CIELO',
      );

      if (trierList.length === 0 || redeCielo.length === 0) {
        continue;
      }

      const trierRef = trierList[0];

      const melhorTipoMatch = this.tipoMatchGrupo(
        trierRef,
        redeCielo,
        vendasIndex,
      );

      const itens: ConciliacaoGrupoItem[] = redeCielo.map((f) => {
        const outra = f.parcela as Rede | Cielo;
        const trierMatch =
          trierList.find((t) => t.parcela === outra.parcela) ?? trierRef;
        return this.buildItem(trierMatch, outra, melhorTipoMatch);
      });

      const temDivergencia = itens.some(
        (item) =>
          item.divergenciaValor ||
          item.divergenciaValorLiquido ||
          item.divergenciaVencimento ||
          item.divergenciaParcelas,
      );

      grupos.push({
        trierIds: trierList.map((t) => t.id),
        status: temDivergencia
          ? ParcelStatus.DIVERGENTE
          : ParcelStatus.CONCILIADO,
        tipoMatch: melhorTipoMatch,
        itens,
      });
    }

    for (const trier of moves.trier) {
      const jaEmGrupo = grupos.some((g) => g.trierIds.includes(trier.id));
      if (jaEmGrupo) continue;

      grupos.push({
        trierIds: [trier.id],
        status: ParcelStatus.NAO_ENCONTRADO,
        tipoMatch: MatchType.VALOR,
        observacao: 'Nenhuma parcela correspondente encontrada',
        itens: [],
      });
    }

    const todasRedeCielo = [
      ...moves.rede.map((r) => ({
        origem: 'REDE' as const,
        id: r.id,
        parcela: r,
      })),
      ...moves.cielo.map((c) => ({
        origem: 'CIELO' as const,
        id: c.id,
        parcela: c,
      })),
    ];

    for (const rc of todasRedeCielo) {
      const jaEmGrupo = grupos.some((g) =>
        g.itens.some((i) =>
          rc.origem === 'REDE'
            ? i.redeParcelaId === rc.id
            : i.cieloParcelaId === rc.id,
        ),
      );
      if (jaEmGrupo) continue;

      const item: ConciliacaoGrupoItem = {
        redeParcelaId: rc.origem === 'REDE' ? rc.id : undefined,
        cieloParcelaId: rc.origem === 'CIELO' ? rc.id : undefined,
        tipoMatch: MatchType.VALOR,
        divergenciaValor: false,
        divergenciaVencimento: false,
        divergenciaValorLiquido: false,
        divergenciaParcelas: false,
        divergenciaModalidade: false,
        divergenciaBandeira: false,
      };

      grupos.push({
        trierIds: [],
        status: ParcelStatus.NAO_ENCONTRADO,
        tipoMatch: MatchType.VALOR,
        observacao: 'Nenhuma parcela Trier correspondente encontrada',
        itens: [item],
      });
    }

    return grupos;
  }

  private tipoMatchGrupo(
    trierRef: Trier,
    redeCielo: ParcelaFonte[],
    vendasIndex: VendaIndex,
  ): MatchType {
    const grupoTrier = vendasIndex.trier.get(trierRef.vendaId!);

    for (const f of redeCielo) {
      const outra = f.parcela as Rede | Cielo;
      const grupoOutra = this.isCielo(outra)
        ? vendasIndex.cielo.get(outra.vendaId!)
        : vendasIndex.rede.get(outra.vendaId!);

      if (
        grupoTrier !== undefined &&
        grupoOutra !== undefined &&
        grupoTrier === grupoOutra
      ) {
        return MatchType.VENDA_CONCILIADA;
      }
    }

    for (const f of redeCielo) {
      const outra = f.parcela as Rede | Cielo;
      if (trierRef.nsuAdministradora && outra.nsu) {
        const nsuTrier = this.normalizarNsu(trierRef.nsuAdministradora);
        const nsuOutra = this.normalizarNsu(outra.nsu);
        if (nsuTrier === nsuOutra) {
          return MatchType.NSU;
        }
      }
    }

    return MatchType.VALOR;
  }
}
