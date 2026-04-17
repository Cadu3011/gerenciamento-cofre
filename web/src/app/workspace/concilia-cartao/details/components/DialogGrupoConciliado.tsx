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
import ListSalesConciliados from "./ListSalesConciliados";

export default function DialogGrupoConciliado({
  selectedGroup,
  setSelectedGroup,
  token,
}: {
  setSelectedGroup: Dispatch<SetStateAction<number | null>>;
  selectedGroup: number | null;
  token: string;
}) {
  const [salesConciliados, setSalesConciliados] = useState<ItensConciliados[]>(
    [],
  );
  const getGrupoConciliado = async (grupoId: number) => {
    const res = await fetch(
      `http://localhost:4000/conciliacao/conciliados?grupoId=${grupoId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const data: ItensConciliados[] = await res.json();
    setSalesConciliados(data);
  };
  useEffect(() => {
    if (selectedGroup) {
      getGrupoConciliado(selectedGroup);
    }
  }, [selectedGroup]);
  const diferenca = Number(salesConciliados[0]?.diferencaGrupo ?? 0);
  return (
    <Dialog
      open={!!selectedGroup}
      onOpenChange={() => {
        setSelectedGroup(null);
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
          <div className="py-2 flex justify-between px-10">
            <span>{salesConciliados[0]?.motivo}</span>

            <span className="text-3xl font-bold text-zinc-700">
              R$ {Number(diferenca)?.toFixed(2)}
            </span>
          </div>
        </DialogHeader>
        {selectedGroup && (
          <div className="relative  h-[60vh] overflow-y-auto">
            <ListSalesConciliados data={salesConciliados} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
