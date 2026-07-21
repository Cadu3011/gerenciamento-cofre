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

  const hasAnyDivergence = itens.some(
    (i) =>
      i.divergenciaValor ||
      i.divergenciaVencimento ||
      i.divergenciaValorLiquido ||
      i.divergenciaParcelas,
  );

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
              const outra = item.outra;
              if (!outra) return null;

              const vencimento =
                outra.origem === "REDE"
                  ? outra.vencimento
                  : outra.dataVencimento;

              return (
                <div key={item.id} className="space-y-2">
                  <h3 className="text-sm font-bold uppercase text-orange-700">
                    {outra.origem}
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
                          {outra.nsu ?? "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {outra.parcela}/{outra.totalParcelas}
                        </TableCell>
                        <TableCell>{outra.modalidade ?? "-"}</TableCell>
                        <TableCell>{outra.bandeira ?? "-"}</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(outra.valor)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(outra.valorLiquido)}
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
            {itens.map((item) => {
              const outra = item.outra;
              if (!outra) return null;

              const divergences = [
                { active: item.divergenciaValor, label: "Valor" },
                { active: item.divergenciaVencimento, label: "Vencimento" },
                {
                  active: item.divergenciaValorLiquido,
                  label: "Vl. Liquido",
                },
                { active: item.divergenciaParcelas, label: "Parcelas" },
              ];

              const hasDivergence = divergences.some((d) => d.active);
              if (!hasDivergence) return null;

              return (
                <div key={item.id} className="text-sm">
                  <span className="font-medium">
                    {outra.origem} (parc {outra.parcela}/{outra.totalParcelas}):
                  </span>{" "}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {divergences.map((d) => (
                      <DivergenceBadge
                        key={d.label}
                        active={d.active}
                        label={d.label}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
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
