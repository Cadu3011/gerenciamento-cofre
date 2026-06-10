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

import { Badge } from "@/components/ui/badge";

import { formatDate } from "../../utils";

interface Registro {
  id: number;
  data: string;
  hora: string;
  origem: string;
  valor: string;
  nsu?: string;
  documentoFiscal?: number;
  bandeira: string;
  modalidade: string;
  status: string;
}

interface Grupo {
  grupoId: number;
  conciliacaoId: number;
  motivo: string | null;
  valorFinal: string;
  registros: Registro[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: Grupo[];
}

export function HealthDetailsDialog({ open, onOpenChange, data }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Detalhes dos Grupos</DialogTitle>
        </DialogHeader>

        <div className="max-h-[80vh] overflow-y-auto pr-2">
          {data.map((grupo) => (
            <div
              key={grupo.grupoId}
              className="mb-8 overflow-hidden rounded-xl border bg-card shadow-sm"
            >
              {/* Cabeçalho do grupo */}
              <div className="grid grid-cols-2 gap-4 border-b bg-muted/30 p-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Grupo</p>
                  <p className="font-medium">{grupo.grupoId}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Conciliação</p>
                  <p className="font-medium">{grupo.conciliacaoId}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Motivo</p>
                  <p className="font-medium">{grupo.motivo ?? "-"}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Diferença</p>

                  <p
                    className={`font-semibold ${
                      Number(grupo.valorFinal) === 0
                        ? "text-green-600"
                        : Number(grupo.valorFinal) > 0
                          ? "text-red-600"
                          : "text-yellow-600 "
                    }`}
                  >
                    {(Number(grupo.valorFinal) * -1).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>
              </div>

              {/* Tabela */}
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>NSU</TableHead>
                      <TableHead>Doc.</TableHead>
                      <TableHead>Bandeira</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {grupo.registros.map((registro) => (
                      <TableRow key={registro.id} className="hover:bg-muted/30">
                        <TableCell>{registro.id}</TableCell>

                        <TableCell>
                          {formatDate(String(registro.data).split("T")[0])}
                        </TableCell>

                        <TableCell>{registro.hora}</TableCell>

                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {registro.origem}
                          </Badge>
                        </TableCell>

                        <TableCell className="font-medium">
                          {Number(registro.valor).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </TableCell>

                        <TableCell>{registro.nsu ?? "-"}</TableCell>

                        <TableCell>{registro.documentoFiscal ?? "-"}</TableCell>

                        <TableCell>{registro.bandeira}</TableCell>

                        <TableCell>{registro.modalidade}</TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              registro.status === "CONCILIADO"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {registro.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}

          {data.length === 0 && (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              Nenhum grupo encontrado.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
