"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listFiliais, Filial } from "@/app/actions/filial";
import { FormFilial } from "./form-filial";

export default function ExibirFiliais() {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Filial | null>(null);

  const fetchFiliais = async () => {
    setLoading(true);
    try {
      const data = await listFiliais();
      setFiliais(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiliais();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (filial: Filial) => {
    setEditing(filial);
    setDialogOpen(true);
  };

  return (
    <div className="flex min-h-screen w-full justify-center bg-neutral-50 p-6">
      <Card className="w-full max-w-4xl bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-5 w-5 text-neutral-500" />
              Gerenciar Filiais
            </CardTitle>
            <CardDescription className="mt-1">
              Cadastre e edite as filiais e suas configurações de integração.
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova filial
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">ID</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead className="text-center">Cofre Trier</TableHead>
                <TableHead className="text-center">Banco Padrão</TableHead>
                <TableHead className="text-center">Banco Recebimentos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-neutral-400">
                    Carregando filiais...
                  </TableCell>
                </TableRow>
              ) : filiais.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-neutral-400">
                    Nenhuma filial encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filiais.map((filial) => (
                  <TableRow key={filial.id}>
                    <TableCell className="font-medium text-neutral-500">
                      {filial.id}
                    </TableCell>
                    <TableCell className="font-medium">{filial.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {filial.idCofreTrier ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {filial.idBancoDefault ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {filial.idBancoRecebimentos ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(filial)}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FormFilial
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        filial={editing}
        onSaved={fetchFiliais}
      />
    </div>
  );
}