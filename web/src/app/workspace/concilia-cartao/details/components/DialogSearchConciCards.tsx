"use client";
import { ConciliacaoDivergenteItem } from "@/app/types/conciCards";
import Decimal from "decimal.js";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import ListSalesDiveregentes from "./ListSalesDivergentes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast, ToastContainer } from "react-toastify";

export default function DialogSearchConciCards({
  selectedGroup,
  setSelectedGroup,
  token,
  date,
  onConciliated,
}: {
  setSelectedGroup: Dispatch<SetStateAction<number | null>>;
  selectedGroup: number | null;
  token: string;
  date: string;
  onConciliated: () => void;
}) {
  const [salesDivergentes, setSalesDivergentes] = useState<
    ConciliacaoDivergenteItem[]
  >([]);
  const [selectedItems, setSelectedItems] = useState<
    ConciliacaoDivergenteItem[]
  >([]);

  const [motivo, setMotivo] = useState<string>("");
  const [loading, setLoading] = useState(false);

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

  const conciliar = async (
    groupIds: number[],
    conciliacaoId: number,
    motivo: string,
  ) => {
    const dataBody = {
      groupIds,
      conciliacaoId,
      motivo: motivo.trim() === "" ? null : motivo,
    };
    const res = await fetch(`http://localhost:4000/conciliacao/conciliar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataBody),
    });

    if (!res.ok) {
      const error = await res.json();

      toast.error(error.message || "Erro ao conciliar");
      return false; // 👈 importante
    }

    await res.json();

    return true;
  };

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
      <DialogContent className="bg-white max-w-5xl max-h-[100vh]">
        <DialogTitle className="flex justify-start text-3xl">
          Conciliar
        </DialogTitle>
        <DialogDescription className="text-lg">
          Selecione as vendas para conciliacao clicando em cima delas. <br /> O
          ideal é que a diferença total se torne R$0,00 (valores Trier - valores
          Adquirentes = R$0,00)
        </DialogDescription>
        <DialogHeader className="">
          <div className="flex justify-center">
            <ToastContainer />
          </div>
          <div className="py-2 flex justify-end px-10">
            <span
              className={`${Number(diferenca) === 0 ? "text-green-600" : "text-red-600"} text-3xl font-bold`}
            >
              R$ {diferenca.toFixed(2)}
            </span>
          </div>
        </DialogHeader>
        {selectedGroup && (
          <div className="relative  h-[50vh] overflow-y-auto">
            <ListSalesDiveregentes
              data={salesDivergentes}
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
              lockedId={selectedGroup}
            />
          </div>
        )}
        <div className="flex justify-between items-end px-8">
          <div className="w-full gap-2 flex flex-col">
            <label>Observação / Motivo</label>
            <Input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-1/2"
              placeholder="Digite a observação ou motivo"
            />
          </div>
          <Button
            className="bg-blue-700 w-24"
            onClick={async () => {
              if (loading) return;

              setLoading(true);
              const ids = selectedItems.map((item) => item.grupoId);
              const conciliacaoId = selectedItems[0]?.conciliacaoId;

              if (!conciliacaoId) return;

              const success = await conciliar(ids, conciliacaoId, motivo);
              setLoading(false);

              if (!success) return;

              onConciliated();

              setSelectedGroup(null);
              setSelectedItems([]);
            }}
            disabled={loading}
          >
            {loading ? "Conciliando..." : "Conciliar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
