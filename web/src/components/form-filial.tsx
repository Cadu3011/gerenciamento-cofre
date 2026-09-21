"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createFilial,
  updateFilial,
  Filial,
  FilialInput,
} from "@/app/actions/filial";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filial?: Filial | null;
  onSaved: () => void;
}

const ip = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? "" : String(v);

export function FormFilial({ open, onOpenChange, filial, onSaved }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [idCofreTrier, setIdCofreTrier] = useState("");
  const [idBancoDefault, setIdBancoDefault] = useState("");
  const [idBancoRecebimentos, setIdBancoRecebimentos] = useState("");
  const [idCielo, setIdCielo] = useState("");
  const [idRede, setIdRede] = useState("");
  const [urlLocalTrier, setUrlLocalTrier] = useState("");
  const [tokenTrier, setTokenTrier] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(ip(filial?.name));
    setIdCofreTrier(ip(filial?.idCofreTrier));
    setIdBancoDefault(ip(filial?.idBancoDefault));
    setIdBancoRecebimentos(ip(filial?.idBancoRecebimentos));
    setIdCielo(ip(filial?.idCielo));
    setIdRede(ip(filial?.idRede));
    setUrlLocalTrier(ip(filial?.urlLocalTrier));
    setTokenTrier(ip(filial?.tokenTrier));
  }, [open, filial]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("O nome da filial é obrigatório");
      return;
    }

    const data: FilialInput = {
      name: name.trim(),
      idCofreTrier: idCofreTrier ? Number(idCofreTrier) : null,
      idBancoDefault: idBancoDefault ? Number(idBancoDefault) : null,
      idBancoRecebimentos: idBancoRecebimentos
        ? Number(idBancoRecebimentos)
        : null,
      idCielo: idCielo || null,
      idRede: idRede || null,
      urlLocalTrier: urlLocalTrier || null,
      tokenTrier: tokenTrier || null,
    };

    setPending(true);
    setError(null);
    try {
      const result = filial
        ? await updateFilial(filial.id, data)
        : await createFilial(data);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {filial ? `Editar Filial ${filial.id}` : "Criar Filial"}
          </DialogTitle>
          <DialogDescription>
            {filial
              ? "Atualize os dados da filial."
              : "Preencha os dados da nova filial."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700">
              Nome
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da filial"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700">
              ID Cofre Trier
            </label>
            <Input
              type="number"
              value={idCofreTrier}
              onChange={(e) => setIdCofreTrier(e.target.value)}
              placeholder="Ex.: 6099"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700">
              ID Banco Padrão (gerenciador do cofre)
            </label>
            <Input
              type="number"
              value={idBancoDefault}
              onChange={(e) => setIdBancoDefault(e.target.value)}
              placeholder="Ex.: 25000"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700">
              ID Banco Recebimentos (destino)
            </label>
            <Input
              type="number"
              value={idBancoRecebimentos}
              onChange={(e) => setIdBancoRecebimentos(e.target.value)}
              placeholder="Ex.: 25099"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700">
              ID Cielo
            </label>
            <Input
              value={idCielo}
              onChange={(e) => setIdCielo(e.target.value)}
              placeholder="Código da filial na Cielo"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700">
              ID Rede
            </label>
            <Input
              value={idRede}
              onChange={(e) => setIdRede(e.target.value)}
              placeholder="Código da filial na Rede"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700">
              URL local Trier
            </label>
            <Input
              value={urlLocalTrier}
              onChange={(e) => setUrlLocalTrier(e.target.value)}
              placeholder="http://..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700">
              Token Trier
            </label>
            <Input
              type="password"
              value={tokenTrier}
              onChange={(e) => setTokenTrier(e.target.value)}
              placeholder="Token de integração"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm font-medium text-red-600">{error}</p>
        )}

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {filial ? "Salvar alterações" : "Criar filial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}