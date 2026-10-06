"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ConciliacaoParcItem,
  FlatRow,
  ParcTotaisDia,
} from "@/app/types/conciParc";
import LegendaConci from "./LegendaConci";
import GroupDetailDialog from "./GroupDetailDialog";
import Filtros, { DIVERGENCIAS, STATUSES } from "./Filtros";
import { formatDate } from "@/app/admin/dashboard/utils";

const STATUS_COLORS: Record<string, string> = {
  CONCILIADO: "bg-green-500 text-white",
  DIVERGENTE: "bg-yellow-400 text-gray-900",
  NAO_ENCONTRADO: "bg-red-500 text-white",
};

const ORIGEM_COLORS: Record<string, string> = {
  TRIER: "bg-blue-600 text-white",
  REDE: "bg-orange-500 text-white",
  CIELO: "bg-purple-600 text-white",
};

const CURRENCY_FORMAT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const DATE_FORMAT_CACHE = new Map<string, string>();

function formatCurrency(value: string | number) {
  return CURRENCY_FORMAT.format(Number(value));
}

function formatVencimento(value: string) {
  if (!value) return "-";
  let cached = DATE_FORMAT_CACHE.get(value);
  if (!cached) {
    cached = new Date(value).toLocaleDateString("pt-BR");
    DATE_FORMAT_CACHE.set(value, cached);
  }
  return cached;
}

function flattenData(data: ConciliacaoParcItem[]): FlatRow[] {
  const rows: FlatRow[] = [];

  for (const grupo of data) {
    const obs = new Set(grupo.observacoes ?? []);
    const divValor = obs.has("DIVERGENCIA_VALOR");
    const divVencimento = obs.has("DIVERGENCIA_VENCIMENTO");
    const divValorLiquido = obs.has("DIVERGENCIA_VALOR_LIQUIDO");
    const divParcelas = obs.has("DIVERGENCIA_QUANTIDADE_PARCELAS");

    for (const t of grupo.triers) {
      rows.push({
        groupId: grupo.id,
        groupStatus: grupo.status,
        tipoMatch: grupo.tipoMatch,
        origem: "TRIER",
        nsu: t.nsuAdministradora,
        parcela: t.parcela,
        totalParcelas: t.totalParcelas,
        modalidade: t.modalidadeVenda,
        bandeira: t.bandeira,
        valor: t.valor,
        valorLiquido: t.valorLiquido,
        taxa: t.taxa,
        vencimento: t.dataVencimento,
        documentoFiscal: t.documentoFiscal,
        divergenciaValor: divValor,
        divergenciaVencimento: divVencimento,
        divergenciaValorLiquido: divValorLiquido,
        divergenciaParcelas: divParcelas,
      });
    }

    for (const item of grupo.itens) {
      rows.push({
        groupId: grupo.id,
        groupStatus: grupo.status,
        tipoMatch: grupo.tipoMatch,
        origem: item.origem,
        nsu: item.nsu,
        parcela: item.parcela,
        totalParcelas: item.totalParcelas,
        modalidade: item.modalidade ?? null,
        bandeira: item.bandeira ?? null,
        valor: item.valor,
        valorLiquido: item.valorLiquido,
        taxa: item.taxa,
        vencimento:
          item.origem === "REDE"
            ? (item.vencimento ?? "")
            : (item.dataVencimento ?? ""),
        divergenciaValor: divValor,
        divergenciaVencimento: divVencimento,
        divergenciaValorLiquido: divValorLiquido,
        divergenciaParcelas: divParcelas,
      });
    }
  }

  return rows;
}

function divergenciaIcons(row: FlatRow): string {
  const icons: string[] = [];
  if (row.divergenciaValor) icons.push("$");
  if (row.divergenciaVencimento) icons.push("\uD83D\uDCC5");
  if (row.divergenciaValorLiquido) icons.push("$L");
  if (row.divergenciaParcelas) icons.push("P");
  return icons.join(" ");
}

function rowBg(row: FlatRow): string {
  if (row.groupStatus === "NAO_ENCONTRADO") return "bg-red-50";
  if (row.groupStatus === "DIVERGENTE") return "bg-yellow-50";
  return "bg-green-50";
}

export default function TablesClient({
  data,
  total,
  page,
  pageSize,
  totais,
  date,
  filialId,
  statuses,
  bandeiras,
  divergencias,
}: {
  data: ConciliacaoParcItem[];
  total: number;
  page: number;
  pageSize: number;
  totais: ParcTotaisDia;
  date: string;
  filialId: number;
  statuses: string[];
  bandeiras: string[];
  divergencias: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeFontes, setActiveFontes] = useState<Set<string>>(
    () => new Set(["TRIER", "REDE", "CIELO"]),
  );
  const [activeMatchTypes, setActiveMatchTypes] = useState<Set<string>>(
    () => new Set(["NSU", "VALOR", "VALOR_DATA", "MANUAL", "VENDA_CONCILIADA"]),
  );
  const [dialogGrupo, setDialogGrupo] = useState<ConciliacaoParcItem | null>(
    null,
  );

  const allRows = useMemo(() => flattenData(data), [data]);

  const statusesAll = useMemo(() => [...STATUSES], []);
  const divergenciasAll = useMemo(() => [...DIVERGENCIAS], []);

  const activeStatuses = useMemo(
    () => new Set(statuses.length ? statuses : statusesAll),
    [statuses, statusesAll],
  );
  const activeDivergencias = useMemo(
    () => new Set(divergencias.length ? divergencias : divergenciasAll),
    [divergencias, divergenciasAll],
  );
  const activeBandeiras = useMemo(() => new Set(bandeiras), [bandeiras]);

  const bandeirasOptions = useMemo(() => {
    const set = new Set<string>();
    for (const g of data) {
      for (const t of g.triers) if (t.bandeira) set.add(t.bandeira);
      for (const i of g.itens) if (i.bandeira) set.add(i.bandeira);
    }
    return [...set].sort();
  }, [data]);

  const filteredRows = useMemo(() => {
    const allMatchTypes = activeMatchTypes.size === 5;
    return allRows.filter((r) => {
      if (!activeFontes.has(r.origem)) return false;
      if (!allMatchTypes) {
        if (!r.tipoMatch || !activeMatchTypes.has(r.tipoMatch)) return false;
      }
      return true;
    });
  }, [allRows, activeFontes, activeMatchTypes]);

  const grupoMap = useMemo(() => {
    const m = new Map<number, ConciliacaoParcItem>();
    for (const g of data) m.set(g.id, g);
    return m;
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function toggleFonte(fonte: string) {
    setActiveFontes((prev) => {
      const next = new Set(prev);
      if (next.has(fonte)) {
        if (next.size > 1) next.delete(fonte);
      } else {
        next.add(fonte);
      }
      return next;
    });
  }

  function toggleMatchType(matchType: string) {
    setActiveMatchTypes((prev) => {
      const next = new Set(prev);
      if (next.has(matchType)) {
        if (next.size > 1) next.delete(matchType);
      } else {
        next.add(matchType);
      }
      return next;
    });
  }

  function navigateFilter(
    key: "status" | "divergencias" | "bandeiras",
    value: string,
    current: string[],
    totalOptions: number,
  ) {
    const next = new Set(current);
    if (next.has(value)) {
      if (next.size > 1) next.delete(value);
    } else {
      next.add(value);
    }
    const params = new URLSearchParams(searchParams.toString());
    if (next.size === totalOptions) {
      params.delete(key);
    } else {
      params.set(key, [...next].join(","));
    }
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function toggleStatus(status: string) {
    navigateFilter("status", status, statuses, STATUSES.length);
  }

  function toggleDivergencia(divergencia: string) {
    navigateFilter(
      "divergencias",
      divergencia,
      divergencias,
      DIVERGENCIAS.length,
    );
  }

  function toggleBandeira(bandeira: string) {
    navigateFilter("bandeiras", bandeira, bandeiras, bandeirasOptions.length);
  }

  return (
    <div className="flex flex-col justify-center items-center w-full">
      <div className="w-full px-10 py-5 bg-blue-950 font-bold">
        <div className="flex justify-between items-start gap-6">
          <div className="bg-white px-5 py-1 gap-2 flex flex-col rounded-md shrink-0">
            <p className="text-3xl">FILIAL {filialId}</p>
            <p className="text-3xl">{formatDate(date)}</p>
            <p className="text-3xl text-start">
              {totais.divergentes === 0 && totais.naoEncontrados === 0
                ? "Tudo Conciliado"
                : `${totais.divergentes} divergente(s), ${totais.naoEncontrados} n\u00e3o encontrado(s)`}
            </p>
          </div>

          <div className="flex gap-3 flex-1 min-w-0 bg-black justify-center items-center px-4 py-3 rounded-md ">
            <div className="bg-blue-900/60 border border-blue-700/50 rounded-lg px-4 py-3 flex flex-col gap-1 min-w-[180px]">
              <span className="text-blue-300 text-xs uppercase tracking-wide">
                Trier
              </span>
              <div className="flex flex-col">
                <span className="text-white text-lg leading-tight">
                  {formatCurrency(totais.trierValor)}
                </span>
                <span className="text-blue-300/80 text-xs">
                  Liquido {formatCurrency(totais.trierLiquido)}
                </span>
                <span className="text-blue-300/80 text-xs">
                  Taxa {formatCurrency(totais.trierTaxa)}
                </span>
              </div>
            </div>

            <div className="bg-blue-900/60 border border-blue-700/50 rounded-lg px-4 py-3 flex flex-col gap-1 min-w-[180px]">
              <span className="text-orange-300 text-xs uppercase tracking-wide">
                Adquirente
              </span>
              <div className="flex flex-col">
                <span className="text-white text-lg leading-tight">
                  {formatCurrency(totais.outraValor)}
                </span>
                <span className="text-orange-300/80 text-xs">
                  Liquido {formatCurrency(totais.outraLiquido)}
                </span>
                <span className="text-orange-300/80 text-xs">
                  Taxa {formatCurrency(totais.outraTaxa)}
                </span>
              </div>
            </div>

            <div
              className={`rounded-lg px-4 py-3 flex flex-col gap-1 min-w-[180px] border ${
                totais.diferencaValor !== 0 || totais.diferencaLiquido !== 0
                  ? "bg-red-900/40 border-red-700/50"
                  : "bg-green-900/40 border-green-700/50"
              }`}
            >
              <span
                className={`text-xs uppercase tracking-wide ${
                  totais.diferencaValor !== 0 || totais.diferencaLiquido !== 0
                    ? "text-red-300"
                    : "text-green-300"
                }`}
              >
                Diferença
              </span>
              <div className="flex flex-col">
                <span
                  className={`text-lg leading-tight font-bold ${
                    totais.diferencaValor !== 0
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  {formatCurrency(totais.diferencaValor)}
                </span>
                <span
                  className={`text-xs ${
                    totais.diferencaLiquido !== 0
                      ? "text-red-300/80"
                      : "text-green-300/80"
                  }`}
                >
                  Liquido {formatCurrency(totais.diferencaLiquido)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white h-[15vh] w-[40vh] flex justify-start items-center p-6 rounded-md shrink-0">
            <LegendaConci />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4">
          <Filtros
            activeFontes={activeFontes}
            activeStatuses={activeStatuses}
            activeDivergencias={activeDivergencias}
            activeBandeiras={activeBandeiras}
            activeMatchTypes={activeMatchTypes}
            bandeirasOptions={bandeirasOptions}
            onToggleFonte={toggleFonte}
            onToggleStatus={toggleStatus}
            onToggleDivergencia={toggleDivergencia}
            onToggleBandeira={toggleBandeira}
            onToggleMatchType={toggleMatchType}
          />

          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              className="px-3 py-1 rounded-md bg-white/10 text-white text-xs disabled:opacity-30"
            >
              Anterior
            </button>
            <span className="text-white text-xs">
              {filteredRows.length} de {allRows.length} linhas
            </span>
            <span className="text-white text-xs">
              | {total.toLocaleString("pt-BR")} grupo(s) — pág. {page}/{totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              className="px-3 py-1 rounded-md bg-white/10 text-white text-xs disabled:opacity-30"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      <div className="relative w-full h-[600px] overflow-y-auto border">
        <Table className="w-full" noWrapper>
          <TableHeader className="bg-blue-950 sticky top-0 z-20">
            <TableRow>
              <TableHead className="text-white text-lg">Origem</TableHead>
              <TableHead className="text-white text-lg">Doc Fiscal</TableHead>
              <TableHead className="text-white text-lg">NSU</TableHead>
              <TableHead className="text-white text-lg">Parcela</TableHead>
              <TableHead className="text-white text-lg">Modalidade</TableHead>
              <TableHead className="text-white text-lg">Bandeira</TableHead>
              <TableHead className="text-white text-lg w-28">Valor</TableHead>
              <TableHead className="text-white text-lg w-28">
                Vl. Liquido.
              </TableHead>
              <TableHead className="text-white text-lg w-24">
                Taxa
              </TableHead>
              <TableHead className="text-white text-lg w-28">
                Vencimento
              </TableHead>
              <TableHead className="text-white text-lg">Status</TableHead>
              <TableHead className="text-white text-lg w-20">Div.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row, idx) => {
              const grupo = grupoMap.get(row.groupId);

              return (
                <TableRow
                  key={`row-${row.groupId}-${row.origem}-${idx}`}
                  className={`text-sm cursor-pointer ${rowBg(row)}`}
                  onClick={() => grupo && setDialogGrupo(grupo)}
                >
                  <TableCell>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        ORIGEM_COLORS[row.origem]
                      }`}
                    >
                      {row.origem}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.documentoFiscal ?? "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.nsu ?? "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.parcela}/{row.totalParcelas}
                  </TableCell>
                  <TableCell>{row.modalidade ?? "-"}</TableCell>
                  <TableCell>{row.bandeira ?? "-"}</TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(row.valor)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.valorLiquido)}
                  </TableCell>
                  <TableCell className="text-right text-gray-600">
                    {formatCurrency(row.taxa)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVencimento(row.vencimento)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        STATUS_COLORS[row.groupStatus]
                      }`}
                    >
                      {row.groupStatus === "NAO_ENCONTRADO"
                        ? "N\u00c3O ENCONTRADO"
                        : row.groupStatus}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {divergenciaIcons(row)}
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={12}
                  className="text-center text-gray-400 py-10"
                >
                  Nenhuma parcela encontrada com os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <GroupDetailDialog
        grupo={dialogGrupo}
        open={dialogGrupo !== null}
        onOpenChange={(open) => {
          if (!open) setDialogGrupo(null);
        }}
      />
    </div>
  );
}