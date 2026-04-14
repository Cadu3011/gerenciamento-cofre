"use client";
import { ConciliacaoDivergenteItem } from "@/app/types/conciCards";
import Decimal from "decimal.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import ListSalesDiveregentes from "./ListSalesDivergentes";

export default function DialogSearchConciCards({
  selectedGroup,
  setSelectedGroup,
  token,
  date,
}: {
  setSelectedGroup: Dispatch<SetStateAction<number | null>>;
  selectedGroup: number | null;
  token: string;
  date: string;
}) {
  const [salesDivergentes, setSalesDivergentes] = useState<
    ConciliacaoDivergenteItem[]
  >([]);
  const [selectedItems, setSelectedItems] = useState<
    ConciliacaoDivergenteItem[]
  >([]);

  const getGruposPendentes = async (date?: string) => {
    const res = await fetch(
      `http://localhost:4000/conciliacao/divergentes?date=${date}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const data: ConciliacaoDivergenteItem[] = await res.json();
    setSalesDivergentes(data);
  };
  useEffect(() => {
    if (selectedGroup) {
      getGruposPendentes(date);
    }
  }, [selectedGroup]);
  useEffect(() => {
    if (selectedGroup && salesDivergentes.length > 0) {
      const baseItem = salesDivergentes.find(
        (i) => i.grupoId === selectedGroup,
      );

      if (baseItem) {
        setSelectedItems([baseItem]);
      }
    }
  }, [salesDivergentes, selectedGroup]);

  const totalTrier = selectedItems
    .filter((i) => i.origem === "TRIER")
    .reduce((acc, i) => acc.plus(new Decimal(i.valor)), new Decimal(0));

  const totalOutros = selectedItems
    .filter((i) => i.origem !== "TRIER")
    .reduce((acc, i) => acc.plus(new Decimal(i.valor)), new Decimal(0));

  const diferenca = totalTrier.minus(totalOutros);
  return (
    <Dialog
      open={!!selectedGroup}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedGroup(null);
          setSelectedItems([]);
        }
      }}
    >
      <DialogContent className="bg-white max-w-5xl">
        <DialogTitle>Conciliar</DialogTitle>
        <DialogDescription className="text-lg">
          Selecione as vendas para conciliacao clicando em cima delas. <br /> O
          ideal é que a diferença total se torne R$0,00 (valores Trier - valores
          Adquirentes = R$0,00)
        </DialogDescription>
        <DialogHeader className="">
          <div className="py-2 flex justify-end px-10">
            {" "}
            <span
              className={`${Number(diferenca) === 0 ? "text-green-600" : "text-red-600"} text-3xl font-bold`}
            >
              R$ {diferenca.toFixed(2)}
            </span>
          </div>
        </DialogHeader>
        {selectedGroup && (
          <div className="relative  h-[500px] overflow-y-auto">
            <ListSalesDiveregentes
              data={salesDivergentes}
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
              lockedId={selectedGroup}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
