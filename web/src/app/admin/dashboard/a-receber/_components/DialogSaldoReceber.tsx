"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getParcAReceberPendentes } from "@/app/api/conciliacao-parc";
import {
  RecebiveisPendentesResult,
  RecebivelPendente,
} from "@/app/types/conciParc";
import { formatNum } from "../../utils";
import GruposRecebivelDialog from "./GruposRecebivelDialog";

const STATUS_COLORS: Record<string, string> = {
  ABERTO: "bg-slate-200 text-slate-700",
  ENVIADO_ERP: "bg-blue-100 text-blue-700",
  CONCILIADO: "bg-green-100 text-green-700",
  DIVERGENTE: "bg-yellow-100 text-yellow-700",
  FECHADO: "bg-slate-300 text-slate-700",
};

const ORIGEM_COLORS: Record<string, string> = {
  TRIER: "bg-blue-600 text-white",
  REDE: "bg-orange-500 text-white",
  CIELO: "bg-purple-600 text-white",
};

function formatDataRecebimento(valor: string) {
  const texto = String(valor ?? "");
  const [ano, mes, dia] = texto.slice(0, 10).split("-");
  if (!dia || !mes) return texto;
  return `${dia}/${mes}/${ano}`;
}

/**
 * Card "Saldo (falta receber)" clicável. Abre um dialog com os recebíveis do
 * período que ainda têm saldo pendente; cada linha abre o dialog de grupos.
 */
export default function DialogSaldoReceber({
  saldo,
  query,
}: {
  saldo: number;
  query: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(false);
  const [data, setData] = useState<RecebiveisPendentesResult | null>(null);
  const [recebivel, setRecebivel] = useState<RecebivelPendente | null>(null);

  function abrir() {
    setOpen(true);
    if (data || loading) return;
    setLoading(true);
    setErro(false);
    getParcAReceberPendentes(query)
      .then((r) => setData(r))
      .catch(() => setErro(true))
      .finally(() => setLoading(false));
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        title="Ver as parcelas que ainda faltam receber"
        className="w-1/4 px-5 flex flex-col gap-2 items-center justify-center bg-amber-200 rounded-lg hover:brightness-95 transition cursor-pointer"
      >
        <p className="font-bold text-center">Saldo (falta receber)</p>
        <div className="text-3xl font-bold text-nowrap">{formatNum(saldo)}</div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] bg-white flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Parcelas que faltam receber</DialogTitle>
            <DialogDescription>
              {data
                ? `${data.total} recebível${
                    data.total === 1 ? "" : "eis"
                  } com saldo pendente no período (${formatNum(
                    data.valorSaldo,
                  )}). Clique em um recebível para ver os grupos de
                  conciliação das parcelas.`
                : "Carregando a lista de pendências..."}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto">
            {loading && (
              <p className="text-sm text-muted-foreground">
                Carregando parcelas...
              </p>
            )}

            {erro && (
              <p className="text-sm text-red-500">
                Não foi possível carregar as pendências.
              </p>
            )}

            {!loading && !erro && data && data.items.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum recebível com saldo pendente no período.
              </p>
            )}

            {!loading && !erro && data && data.items.length > 0 && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Adquirente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Parcelas</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead className="text-right">Esperado</TableHead>
                      <TableHead className="text-right">Recebido</TableHead>
                      <TableHead className="text-right">Falta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setRecebivel(item)}
                      >
                        <TableCell>
                          {formatDataRecebimento(item.dataRecebimento)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.adquirente}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_COLORS[item.status] ??
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.nParcelas}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.origens.map((o) => (
                              <span
                                key={o}
                                className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  ORIGEM_COLORS[o] ?? ""
                                }`}
                              >
                                {o}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNum(item.valorEsperado)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNum(item.valorRecebido ?? 0)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatNum(item.saldo)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <GruposRecebivelDialog
        recebivel={recebivel}
        onClose={() => setRecebivel(null)}
      />
    </>
  );
}
