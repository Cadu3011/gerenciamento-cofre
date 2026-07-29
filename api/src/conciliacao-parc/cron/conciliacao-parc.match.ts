import { Injectable, Logger } from '@nestjs/common';
import {
  Cielo,
  ConciliacaoGrupo,
  ConciliacaoGrupoItem,
  Data,
  ParcelaFonte,
  Rede,
  Trier,
} from './repository/contract';
import { MatchType, ParcelStatus } from '@prisma/client';

@Injectable()
export class ConciliacaoParcMatch {
  private readonly logger = new Logger(ConciliacaoParcMatch.name);

  private isCielo(obj: Rede | Cielo): obj is Cielo {
    return 'codigoTransacao' in obj;
  }

  private parcelKey(origem: 'TRIER' | 'REDE' | 'CIELO', id: number): string {
    return `${origem}:${id}`;
  }

  private fonteKey(f: ParcelaFonte): string {
    return this.parcelKey(f.origem, f.parcela.id);
  }

  private normalizarNsu(nsu: string | null | undefined): string {
    return (nsu ?? '').replace(/^0+/, '');
  }

  private getNsu(f: ParcelaFonte): string | null {
    if (f.origem === 'TRIER') {
      return this.normalizarNsu((f.parcela as Trier).nsuAdministradora);
    }
    return this.normalizarNsu((f.parcela as Rede | Cielo).nsu);
  }

  private getData(f: ParcelaFonte): Date | null {
    if (f.origem === 'TRIER') {
      return (f.parcela as Trier).dataEmissao;
    }
    return (f.parcela as Rede | Cielo).dataVenda;
  }

  private agrupar(
    moves: Data,
  ): Array<{ group: ParcelaFonte[]; tipoMatch: MatchType }> {
    const result: Array<{ group: ParcelaFonte[]; tipoMatch: MatchType }> = [];
    const usedKeys = new Set<string>();

    const allFontes: ParcelaFonte[] = [];
    for (const t of moves.trier)
      allFontes.push({ origem: 'TRIER', parcela: t });
    for (const r of moves.rede) allFontes.push({ origem: 'REDE', parcela: r });
    for (const c of moves.cielo)
      allFontes.push({ origem: 'CIELO', parcela: c });

    // ── Maps de venda: vendaId → Map<parcela, ParcelaFonte> ──
    const trierVendaMap = new Map<number, Map<number, ParcelaFonte>>();
    const redeVendaMap = new Map<number, Map<number, ParcelaFonte>>();
    const cieloVendaMap = new Map<number, Map<number, ParcelaFonte>>();

    for (const f of allFontes) {
      const vendaId = f.parcela.vendaId;
      if (!vendaId) continue;

      let map: Map<number, Map<number, ParcelaFonte>>;
      if (f.origem === 'TRIER') map = trierVendaMap;
      else if (f.origem === 'REDE') map = redeVendaMap;
      else map = cieloVendaMap;

      const sale = map.get(vendaId) ?? new Map<number, ParcelaFonte>();
      sale.set(f.parcela.parcela, f);
      map.set(vendaId, sale);
    }

    // ── Nível 1: Vendas Conciliadas ──
    if (moves.conciliacoesVenda) {
      for (const conc of moves.conciliacoesVenda) {
        const concFontes: ParcelaFonte[] = [];

        for (const item of conc.itens) {
          if (item.trierId) {
            const sale = trierVendaMap.get(item.trierId);
            if (sale) {
              for (const fonte of sale.values()) {
                concFontes.push(fonte);
              }
            }
          }
          if (item.redeId) {
            const sale = redeVendaMap.get(item.redeId);
            if (sale) {
              for (const fonte of sale.values()) {
                concFontes.push(fonte);
              }
            }
          }
          if (item.cieloId) {
            const sale = cieloVendaMap.get(item.cieloId);
            if (sale) {
              for (const fonte of sale.values()) {
                concFontes.push(fonte);
              }
            }
          }
        }

        if (concFontes.length === 0) continue;

        const triers = concFontes.filter((f) => f.origem === 'TRIER');
        const rcs = concFontes.filter((f) => f.origem !== 'TRIER');

        if (triers.length === 0 || rcs.length === 0) {
          continue;
        }

        const trierTotal = (triers[0].parcela as Trier).totalParcelas;
        const rcTotal = (rcs[0].parcela as Rede | Cielo).totalParcelas;

        if (trierTotal === rcTotal && triers.length === rcs.length) {
          for (const t of triers) {
            const tParcela = (t.parcela as Trier).parcela;
            const matchingRc = rcs.find(
              (rc) => (rc.parcela as Rede | Cielo).parcela === tParcela,
            );
            if (matchingRc) {
              result.push({
                group: [t, matchingRc],
                tipoMatch: MatchType.VENDA_CONCILIADA,
              });
              usedKeys.add(this.fonteKey(t));
              usedKeys.add(this.fonteKey(matchingRc));
            }
          }
        } else {
          result.push({
            group: concFontes,
            tipoMatch: MatchType.VENDA_CONCILIADA,
          });
          for (const f of concFontes) usedKeys.add(this.fonteKey(f));
        }
      }
    }

    // ── Nível 2: NSU + Parcela ──
    const nsuMap = new Map<string, ParcelaFonte[]>();
    for (const f of allFontes) {
      if (usedKeys.has(this.fonteKey(f))) continue;
      const nsu = this.getNsu(f);
      if (!nsu) continue;
      const p = f.parcela.parcela;
      const nsuKey = `${nsu}:${p}`;
      const list = nsuMap.get(nsuKey) ?? [];
      list.push(f);
      nsuMap.set(nsuKey, list);
    }

    for (const fontes of nsuMap.values()) {
      const triers = fontes.filter((f) => f.origem === 'TRIER');
      const rcs = fontes.filter((f) => f.origem !== 'TRIER');

      if (triers.length === 0 || rcs.length === 0) continue;

      const trierTotal = (triers[0].parcela as Trier).totalParcelas;
      const rcTotal = (rcs[0].parcela as Rede | Cielo).totalParcelas;

      if (trierTotal === rcTotal) {
        for (const t of triers) {
          const tParcela = (t.parcela as Trier).parcela;
          const matchingRc = rcs.find(
            (rc) =>
              (rc.parcela as Rede | Cielo).parcela === tParcela &&
              !usedKeys.has(this.fonteKey(rc)),
          );
          if (matchingRc) {
            result.push({
              group: [t, matchingRc],
              tipoMatch: MatchType.NSU,
            });
            usedKeys.add(this.fonteKey(t));
            usedKeys.add(this.fonteKey(matchingRc));
          }
        }
      } else {
        const allGroupFontes = new Set<ParcelaFonte>(fontes);

        for (const f of fontes) {
          const vendaId = f.parcela.vendaId;
          if (!vendaId) continue;

          let saleMap: Map<number, Map<number, ParcelaFonte>>;
          if (f.origem === 'TRIER') saleMap = trierVendaMap;
          else if (f.origem === 'REDE') saleMap = redeVendaMap;
          else saleMap = cieloVendaMap;

          const sale = saleMap.get(vendaId);
          if (sale) {
            for (const saleFonte of sale.values()) {
              if (!usedKeys.has(this.fonteKey(saleFonte))) {
                allGroupFontes.add(saleFonte);
              }
            }
          }
        }

        const groupArray = [...allGroupFontes];
        result.push({ group: groupArray, tipoMatch: MatchType.NSU });
        for (const f of groupArray) usedKeys.add(this.fonteKey(f));
      }
    }

    // ── Nível 3: Valor + Parcela + TotalParcelas ──
    const valorMap = new Map<string, ParcelaFonte[]>();
    for (const f of allFontes) {
      if (usedKeys.has(this.fonteKey(f))) continue;
      const p = f.parcela;
      const data = this.getData(f);
      if (!data) continue;
      const dataKey = data.toISOString().slice(0, 10);
      const valorKey = `${Number(p.valor)}:${p.parcela}:${p.totalParcelas}:${dataKey}`;
      const list = valorMap.get(valorKey) ?? [];
      list.push(f);
      valorMap.set(valorKey, list);
    }

    for (const fontes of valorMap.values()) {
      const triers = fontes.filter((f) => f.origem === 'TRIER');
      const rcs = fontes.filter((f) => f.origem !== 'TRIER');

      if (triers.length === 0 || rcs.length === 0) continue;

      for (const t of triers) {
        const tParcela = (t.parcela as Trier).parcela;
        const matchingRc = rcs.find(
          (rc) =>
            (rc.parcela as Rede | Cielo).parcela === tParcela &&
            !usedKeys.has(this.fonteKey(rc)),
        );
        if (matchingRc) {
          result.push({
            group: [t, matchingRc],
            tipoMatch: MatchType.VALOR,
          });
          usedKeys.add(this.fonteKey(t));
          usedKeys.add(this.fonteKey(matchingRc));
        }
      }
    }

    return result;
  }

  private parcelasSeguras(grupo: ParcelaFonte[]): Set<string> {
    const seguras = new Set<string>();
    const triers = grupo
      .filter((f) => f.origem === 'TRIER')
      .map((f) => f.parcela as Trier);
    const rcFontes = grupo.filter(
      (f) => f.origem === 'REDE' || f.origem === 'CIELO',
    );

    for (const t of triers) {
      for (const f of rcFontes) {
        const rc = f.parcela as Rede | Cielo;

        if (t.nsuAdministradora && rc.nsu) {
          if (
            this.normalizarNsu(t.nsuAdministradora) ===
              this.normalizarNsu(rc.nsu) &&
            t.parcela === rc.parcela
          ) {
            seguras.add(this.parcelKey('TRIER', t.id));
            seguras.add(this.parcelKey(f.origem, rc.id));
          }
        }
      }
    }

    return seguras;
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
    const agrupados = this.agrupar(moves);

    const VALID_THRESHOLD = 5.0;
    const gruposValidados: Array<{
      group: ParcelaFonte[];
      tipoMatch: MatchType;
    }> = [];

    for (const { group, tipoMatch } of agrupados) {
      const triers = group.filter((f) => f.origem === 'TRIER');
      const rcs = group.filter(
        (f) => f.origem === 'REDE' || f.origem === 'CIELO',
      );

      if (triers.length === 0 || rcs.length === 0) continue;

      const totalTrier = triers.reduce(
        (sum, f) => sum + Number((f.parcela as Trier).valor),
        0,
      );
      const totalRc = rcs.reduce(
        (sum, f) => sum + Number((f.parcela as Rede | Cielo).valor),
        0,
      );
      const diff = Math.abs(totalTrier - totalRc);

      if (diff > VALID_THRESHOLD) {
        const seguras = this.parcelasSeguras(group);
        const filtrado = group.filter((f) => seguras.has(this.fonteKey(f)));
        if (filtrado.length > 0) {
          gruposValidados.push({ group: filtrado, tipoMatch });
        }
      } else {
        gruposValidados.push({ group, tipoMatch });
      }
    }

    const grupos: ConciliacaoGrupo[] = [];

    for (const { group, tipoMatch } of gruposValidados) {
      const trierList = group
        .filter((f) => f.origem === 'TRIER')
        .map((f) => f.parcela as Trier);
      const redeCielo = group.filter(
        (f) => f.origem === 'REDE' || f.origem === 'CIELO',
      );

      if (trierList.length === 0 || redeCielo.length === 0) {
        continue;
      }

      const trierRef = trierList[0];

      const itens: ConciliacaoGrupoItem[] = redeCielo.map((f) => {
        const outra = f.parcela as Rede | Cielo;
        const trierMatch =
          trierList.find((t) => t.parcela === outra.parcela) ?? trierRef;
        return this.buildItem(trierMatch, outra, tipoMatch);
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
        tipoMatch,
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
      })),
      ...moves.cielo.map((c) => ({
        origem: 'CIELO' as const,
        id: c.id,
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

    // ── Nível 4: Vendas Conciliadas (sem validação) ──
    if (moves.conciliacoesVenda) {
      const neTrierIds = new Set<number>();
      const neCieloIds = new Set<number>();
      const neRedeIds = new Set<number>();

      for (const g of grupos) {
        if (g.status !== ParcelStatus.NAO_ENCONTRADO) continue;
        for (const tid of g.trierIds) neTrierIds.add(tid);
        for (const it of g.itens) {
          if (it.cieloParcelaId) neCieloIds.add(it.cieloParcelaId);
          if (it.redeParcelaId) neRedeIds.add(it.redeParcelaId);
        }
      }

      const neTrierByVenda = new Map<number, Trier[]>();
      const neCieloByVenda = new Map<number, Cielo[]>();
      const neRedeByVenda = new Map<number, Rede[]>();

      for (const t of moves.trier) {
        if (!neTrierIds.has(t.id) || !t.vendaId) continue;
        const list = neTrierByVenda.get(t.vendaId) ?? [];
        list.push(t);
        neTrierByVenda.set(t.vendaId, list);
      }
      for (const c of moves.cielo) {
        if (!neCieloIds.has(c.id) || !c.vendaId) continue;
        const list = neCieloByVenda.get(c.vendaId) ?? [];
        list.push(c);
        neCieloByVenda.set(c.vendaId, list);
      }
      for (const r of moves.rede) {
        if (!neRedeIds.has(r.id) || !r.vendaId) continue;
        const list = neRedeByVenda.get(r.vendaId) ?? [];
        list.push(r);
        neRedeByVenda.set(r.vendaId, list);
      }

      const l4Groups: ConciliacaoGrupo[] = [];
      const claimedTrierIds = new Set<number>();
      const claimedCieloIds = new Set<number>();
      const claimedRedeIds = new Set<number>();

      for (const conc of moves.conciliacoesVenda) {
        const concVendaIds = new Set<number>();
        for (const item of conc.itens) {
          if (item.trierId) concVendaIds.add(item.trierId);
          if (item.cieloId) concVendaIds.add(item.cieloId);
          if (item.redeId) concVendaIds.add(item.redeId);
        }

        const concTrierNe: Trier[] = [];
        const concCieloNe: Cielo[] = [];
        const concRedeNe: Rede[] = [];

        for (const [vendaId, parcels] of neTrierByVenda) {
          if (concVendaIds.has(vendaId)) concTrierNe.push(...parcels);
        }
        for (const [vendaId, parcels] of neCieloByVenda) {
          if (concVendaIds.has(vendaId)) concCieloNe.push(...parcels);
        }
        for (const [vendaId, parcels] of neRedeByVenda) {
          if (concVendaIds.has(vendaId)) concRedeNe.push(...parcels);
        }

        const hasTrier = concTrierNe.length > 0;
        const hasRc = concCieloNe.length > 0 || concRedeNe.length > 0;
        if (!hasTrier || !hasRc) continue;

        const trierRef = concTrierNe[0];
        const rcFontes: Array<{ origem: 'CIELO' | 'REDE'; parcela: Cielo | Rede }> = [
          ...concCieloNe.map((c) => ({ origem: 'CIELO' as const, parcela: c })),
          ...concRedeNe.map((r) => ({ origem: 'REDE' as const, parcela: r })),
        ];

        const itens: ConciliacaoGrupoItem[] = rcFontes.map((f) =>
          this.buildItem(trierRef, f.parcela, MatchType.VENDA_CONCILIADA),
        );

        const temDivergencia = itens.some(
          (i) =>
            i.divergenciaValor ||
            i.divergenciaValorLiquido ||
            i.divergenciaVencimento ||
            i.divergenciaParcelas,
        );

        l4Groups.push({
          trierIds: concTrierNe.map((t) => t.id),
          status: temDivergencia
            ? ParcelStatus.DIVERGENTE
            : ParcelStatus.CONCILIADO,
          tipoMatch: MatchType.VENDA_CONCILIADA,
          itens,
        });

        for (const t of concTrierNe) claimedTrierIds.add(t.id);
        for (const c of concCieloNe) claimedCieloIds.add(c.id);
        for (const r of concRedeNe) claimedRedeIds.add(r.id);
      }

      if (l4Groups.length > 0) {
        const filtered = grupos.filter((g) => {
          if (g.status !== ParcelStatus.NAO_ENCONTRADO) return true;
          if (
            g.trierIds.length > 0 &&
            g.trierIds.every((id) => claimedTrierIds.has(id))
          )
            return false;
          if (
            g.itens.length > 0 &&
            g.itens.every(
              (i) =>
                (i.cieloParcelaId && claimedCieloIds.has(i.cieloParcelaId)) ||
                (i.redeParcelaId && claimedRedeIds.has(i.redeParcelaId)),
            )
          )
            return false;
          return true;
        });

        return [...filtered, ...l4Groups];
      }
    }

    return grupos;
  }
}
