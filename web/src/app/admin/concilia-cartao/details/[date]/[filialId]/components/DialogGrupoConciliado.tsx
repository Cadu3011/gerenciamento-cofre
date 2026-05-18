"use client";
import { ItensConciliados } from "@/app/types/conciCards";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast, ToastContainer } from "react-toastify";
import { ConciliacaoTable } from "./ConciliacaoTable/ConciliacaoTable";
import {
  desconciliarGrupo,
  getGrupoConciliado,
} from "@/app/api/cartao/conciCards";

export default function DialogGrupoConciliado({
  selectedGroup,
  setSelectedGroup,
  token,
  onConciliated,
}: {
  setSelectedGroup: Dispatch<SetStateAction<number | null>>;
  selectedGroup: number;
  token: string;
  onConciliated: () => void;
}) {
  const [salesConciliados, setSalesConciliados] = useState<ItensConciliados[]>(
    [],
  );
  const [loading, setLoading] = useState(false);

  const getConciliados = async (grupoId: number) => {
    const data: ItensConciliados[] = await getGrupoConciliado(grupoId);
    setSalesConciliados(data);
  };

  useEffect(() => {
    if (selectedGroup) {
      getConciliados(selectedGroup);
    }
  }, [selectedGroup]);
  const diferenca = Number(salesConciliados[0]?.diferencaGrupo ?? 0);

  const desconciliar = async (grupoId: number) => {
    const res = await desconciliarGrupo(grupoId);

    if (!res.ok) {
      const error = await res.data;

      toast.error(error.message || "Erro ao conciliar");
      return false; // 👈 importante
    }

    await res.data;

    return true;
  };
  return (
    <Dialog
      open={!!selectedGroup}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedGroup(null);
        }
      }}
    >
      <DialogContent className="bg-white max-w-5xl max-h-[100vh]">
        <DialogTitle className="flex justify-start text-3xl">
          Conciliados
        </DialogTitle>
        <DialogDescription className="text-lg">
          Valores ja conciliados
        </DialogDescription>
        <DialogHeader className="">
          <div className="flex justify-center">
            <ToastContainer />
          </div>
          <div className="py-2 flex justify-between px-10">
            <span>{salesConciliados[0]?.motivo}</span>

            <span className="text-3xl font-bold text-zinc-700">
              R$ {Number(diferenca)?.toFixed(2)}
            </span>
          </div>
        </DialogHeader>
        {selectedGroup && (
          <div className="relative  h-[60vh] overflow-y-auto">
            <ConciliacaoTable data={salesConciliados} />
          </div>
        )}
        <div className="flex justify-end px-10">
          <Button
            className="bg-blue-700 w-24"
            onClick={async () => {
              if (loading) return;

              setLoading(true);

              const success = await desconciliar(selectedGroup);
              setLoading(false);

              if (!success) return;

              onConciliated();

              setSelectedGroup(null);
            }}
            disabled={loading}
          >
            {loading ? "Desconciliando..." : "Desconciliar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
