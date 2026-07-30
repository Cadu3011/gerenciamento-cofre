"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConciliacaoParcItem } from "@/app/types/conciParc";

interface Props {
  grupo: ConciliacaoParcItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR");
}

function DivergenceBadge({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        active ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
      }`}
    >
      {active ? "\u2717" : "\u2713"} {label}
    </span>
  );
}

export default function GroupDetailDialog({
  grupo,
  open,
  onOpenChange,
}: Props) {
  if (!grupo) return null;

  const triers = grupo.triers;
  const itens = grupo.itens;
  const obs = new Set(grupo.observacoes ?? []);

  const hasAnyDivergence = obs.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] bg-white overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Grupo #{grupo.id}
            <span
              className={`text-sm px-2 py-0.5 rounded-full ${
                grupo.status === "CONCILIADO"
                  ? "bg-green-100 text-green-700"
                  : grupo.status === "DIVERGENTE"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {grupo.status}
            </span>
            {grupo.tipoMatch && (
              <span className="text-sm text-gray-500">
                Match: {grupo.tipoMatch}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {triers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-blue-700 uppercase">
              Trier ({triers.length})
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doc Fiscal</TableHead>
                  <TableHead>NSU</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Bandeira</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Vl. Liquido.</TableHead>
                  <TableHead className="text-right">Vencimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {triers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">
                      {t.documentoFiscal ?? "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {t.nsuAdministradora ?? "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {t.parcela}/{t.totalParcelas}
                    </TableCell>
                    <TableCell>{t.modalidadeVenda ?? "-"}</TableCell>
                    <TableCell>{t.bandeira ?? "-"}</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(t.valor)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(t.valorLiquido)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDate(t.dataVencimento)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {itens.length > 0 && (
          <div className="space-y-4">
            {itens.map((item) => {
              const vencimento =
                item.origem === "REDE"
                  ? item.vencimento
                  : item.dataVencimento;

              return (
                <div key={item.id} className="space-y-2">
                  <h3 className="text-sm font-bold uppercase text-orange-700">
                    {item.origem}
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NSU</TableHead>
                        <TableHead>Parcela</TableHead>
                        <TableHead>Modalidade</TableHead>
                        <TableHead>Bandeira</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">
                          Vl. Liquido.
                        </TableHead>
                        <TableHead className="text-right">Vencimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-mono text-xs">
                          {item.nsu ?? "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.parcela}/{item.totalParcelas}
                        </TableCell>
                        <TableCell>{item.modalidade ?? "-"}</TableCell>
                        <TableCell>{item.bandeira ?? "-"}</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(item.valor)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.valorLiquido)}
                        </TableCell>
                        <TableCell className="text-right">
                          {vencimento ? formatDate(vencimento) : "-"}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        )}

        {hasAnyDivergence && (
          <div className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-bold text-gray-700">Divergencias</h3>
            <div className="flex flex-wrap gap-1">
              {obs.has("DIVERGENCIA_VALOR") && (
                <DivergenceBadge active label="Valor" />
              )}
              {obs.has("DIVERGENCIA_VENCIMENTO") && (
                <DivergenceBadge active label="Vencimento" />
              )}
              {obs.has("DIVERGENCIA_VALOR_LIQUIDO") && (
                <DivergenceBadge active label="Vl. Liquido" />
              )}
              {obs.has("DIVERGENCIA_QUANTIDADE_PARCELAS") && (
                <DivergenceBadge active label="Parcelas" />
              )}
            </div>
          </div>
        )}

        {grupo.observacao && (
          <div className="border-t pt-4 text-sm text-gray-600">
            <strong>Observação:</strong> {grupo.observacao}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
