"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConciliacaoParcItem, FlatRow } from "@/app/types/conciParc";
import LegendaConci from "./LegendaConci";
import GroupDetailDialog from "./GroupDetailDialog";
import Filtros from "./Filtros";
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

function flattenData(data: ConciliacaoParcItem[]): FlatRow[] {
  const rows: FlatRow[] = [];

  for (const grupo of data) {
    for (const t of grupo.triers) {
      let divValor = false;
      let divVencimento = false;
      let divValorLiquido = false;
      let divParcelas = false;

      for (const item of grupo.itens) {
        if (item.divergenciaValor) divValor = true;
        if (item.divergenciaVencimento) divVencimento = true;
        if (item.divergenciaValorLiquido) divValorLiquido = true;
        if (item.divergenciaParcelas) divParcelas = true;
      }

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
      const outra = item.outra;
      if (!outra) continue;

      rows.push({
        groupId: grupo.id,
        groupStatus: grupo.status,
        tipoMatch: grupo.tipoMatch,
        origem: outra.origem,
        nsu: outra.nsu,
        parcela: outra.parcela,
        totalParcelas: outra.totalParcelas,
        modalidade: outra.modalidade ?? null,
        bandeira: outra.bandeira ?? null,
        valor: outra.valor,
        valorLiquido: outra.valorLiquido,
        taxa: outra.taxa,
        vencimento:
          outra.origem === "REDE"
            ? (outra.vencimento ?? "")
            : (outra.dataVencimento ?? ""),
        divergenciaValor: item.divergenciaValor,
        divergenciaVencimento: item.divergenciaVencimento,
        divergenciaValorLiquido: item.divergenciaValorLiquido,
        divergenciaParcelas: item.divergenciaParcelas,
      });
    }
  }

  return rows;
}

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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
  date,
  filialId,
}: {
  data: ConciliacaoParcItem[];
  date: string;
  filialId: number;
}) {
  const [activeFontes, setActiveFontes] = useState<Set<string>>(
    () => new Set(["TRIER", "REDE", "CIELO"]),
  );
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(
    () => new Set(["CONCILIADO", "DIVERGENTE", "NAO_ENCONTRADO"]),
  );
  const [activeDivergencias, setActiveDivergencias] = useState<Set<string>>(
    () => new Set(["VALOR", "VL_LIQUIDO", "VENCIMENTO", "PARCELAS"]),
  );
  const [activeMatchTypes, setActiveMatchTypes] = useState<Set<string>>(
    () => new Set(["NSU", "VALOR", "VALOR_DATA", "MANUAL", "VENDA_CONCILIADA"]),
  );
  const [dialogGrupo, setDialogGrupo] = useState<ConciliacaoParcItem | null>(
    null,
  );

  const allRows = useMemo(() => flattenData(data), [data]);

  const filteredRows = useMemo(() => {
    const allDivergencias = activeDivergencias.size === 4;
    const allMatchTypes = activeMatchTypes.size === 5;
    return allRows.filter((r) => {
      if (!activeFontes.has(r.origem) || !activeStatuses.has(r.groupStatus))
        return false;
      if (!allDivergencias) {
        const hasDiv =
          (activeDivergencias.has("VALOR") && r.divergenciaValor) ||
          (activeDivergencias.has("VL_LIQUIDO") && r.divergenciaValorLiquido) ||
          (activeDivergencias.has("VENCIMENTO") && r.divergenciaVencimento) ||
          (activeDivergencias.has("PARCELAS") && r.divergenciaParcelas);
        if (!hasDiv) return false;
      }
      if (!allMatchTypes) {
        if (!r.tipoMatch || !activeMatchTypes.has(r.tipoMatch)) return false;
      }
      return true;
    });
  }, [allRows, activeFontes, activeStatuses, activeDivergencias, activeMatchTypes]);

  const grupoMap = useMemo(() => {
    const m = new Map<number, ConciliacaoParcItem>();
    for (const g of data) m.set(g.id, g);
    return m;
  }, [data]);

  const totalDivergentes = data.filter((g) => g.status === "DIVERGENTE").length;
  const totalNaoEncontrados = data.filter(
    (g) => g.status === "NAO_ENCONTRADO",
  ).length;

  const totalTrierValor = data.reduce(
    (sum, g) => sum + g.triers.reduce((s, t) => s + Number(t.valor), 0),
    0,
  );
  const totalOutraValor = data.reduce(
    (sum, g) =>
      sum +
      g.itens.reduce((s, i) => s + (i.outra ? Number(i.outra.valor) : 0), 0),
    0,
  );
  const diferencaValor = totalTrierValor - totalOutraValor;

  const totalTrierLiquido = data.reduce(
    (sum, g) => sum + g.triers.reduce((s, t) => s + Number(t.valorLiquido), 0),
    0,
  );
  const totalOutraLiquido = data.reduce(
    (sum, g) =>
      sum +
      g.itens.reduce(
        (s, i) => s + (i.outra ? Number(i.outra.valorLiquido) : 0),
        0,
      ),
    0,
  );
  const diferencaLiquido = totalTrierLiquido - totalOutraLiquido;

  const totalTrierTaxa = filteredRows
    .filter((r) => r.origem === "TRIER")
    .reduce((sum, r) => sum + Number(r.taxa), 0);
  const totalOutraTaxa = filteredRows
    .filter((r) => r.origem !== "TRIER")
    .reduce((sum, r) => sum + Number(r.taxa), 0);

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

  function toggleStatus(status: string) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        if (next.size > 1) next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }

  function toggleDivergencia(divergencia: string) {
    setActiveDivergencias((prev) => {
      const next = new Set(prev);
      if (next.has(divergencia)) {
        if (next.size > 1) next.delete(divergencia);
      } else {
        next.add(divergencia);
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

  return (
    <div className="flex flex-col justify-center items-center w-full">
      <div className="w-full px-10 py-5 bg-blue-950 font-bold">
        <div className="flex justify-between items-start gap-6">
          <div className="bg-white px-5 py-1 gap-2 flex flex-col rounded-md shrink-0">
            <p className="text-3xl">FILIAL {filialId}</p>
            <p className="text-3xl">{formatDate(date)}</p>
            <p className="text-3xl text-start">
              {totalDivergentes === 0 && totalNaoEncontrados === 0
                ? "Tudo Conciliado"
                : `${totalDivergentes} divergente(s), ${totalNaoEncontrados} n\u00e3o encontrado(s)`}
            </p>
          </div>

          <div className="flex gap-3 flex-1 min-w-0 bg-black justify-center items-center px-4 py-3 rounded-md ">
            <div className="bg-blue-900/60 border border-blue-700/50 rounded-lg px-4 py-3 flex flex-col gap-1 min-w-[180px]">
              <span className="text-blue-300 text-xs uppercase tracking-wide">
                Trier
              </span>
              <div className="flex flex-col">
                <span className="text-white text-lg leading-tight">
                  {formatCurrency(totalTrierValor)}
                </span>
                <span className="text-blue-300/80 text-xs">
                  Liquido {formatCurrency(totalTrierLiquido)}
                </span>
                <span className="text-blue-300/80 text-xs">
                  Taxa {formatCurrency(totalTrierTaxa)}
                </span>
              </div>
            </div>

            <div className="bg-blue-900/60 border border-blue-700/50 rounded-lg px-4 py-3 flex flex-col gap-1 min-w-[180px]">
              <span className="text-orange-300 text-xs uppercase tracking-wide">
                Adquirente
              </span>
              <div className="flex flex-col">
                <span className="text-white text-lg leading-tight">
                  {formatCurrency(totalOutraValor)}
                </span>
                <span className="text-orange-300/80 text-xs">
                  Liquido {formatCurrency(totalOutraLiquido)}
                </span>
                <span className="text-orange-300/80 text-xs">
                  Taxa {formatCurrency(totalOutraTaxa)}
                </span>
              </div>
            </div>

            <div
              className={`rounded-lg px-4 py-3 flex flex-col gap-1 min-w-[180px] border ${
                diferencaValor !== 0 || diferencaLiquido !== 0
                  ? "bg-red-900/40 border-red-700/50"
                  : "bg-green-900/40 border-green-700/50"
              }`}
            >
              <span
                className={`text-xs uppercase tracking-wide ${
                  diferencaValor !== 0 || diferencaLiquido !== 0
                    ? "text-red-300"
                    : "text-green-300"
                }`}
              >
                Diferença
              </span>
              <div className="flex flex-col">
                <span
                  className={`text-lg leading-tight font-bold ${
                    diferencaValor !== 0 ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {formatCurrency(diferencaValor)}
                </span>
                <span
                  className={`text-xs ${
                    diferencaLiquido !== 0
                      ? "text-red-300/80"
                      : "text-green-300/80"
                  }`}
                >
                  Liquido {formatCurrency(diferencaLiquido)}
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
            activeMatchTypes={activeMatchTypes}
            onToggleFonte={toggleFonte}
            onToggleStatus={toggleStatus}
            onToggleDivergencia={toggleDivergencia}
            onToggleMatchType={toggleMatchType}
          />

          <div className="flex items-center gap-1 ml-auto">
            <span className="text-white text-xs">
              {filteredRows.length} de {allRows.length} linhas
            </span>
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
                    {row.vencimento
                      ? new Date(row.vencimento).toLocaleDateString("pt-BR")
                      : "-"}
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
