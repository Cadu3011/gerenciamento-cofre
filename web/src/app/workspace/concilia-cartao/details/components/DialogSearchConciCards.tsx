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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast, ToastContainer } from "react-toastify";
import { ConciliacaoTable } from "./ConciliacaoTable/ConciliacaoTable";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDownIcon } from "lucide-react";

export default function DialogSearchConciCards({
  selectedGroup,
  setSelectedGroup,
  token,
  onConciliated,
  dateInitial,
}: {
  setSelectedGroup: Dispatch<SetStateAction<number | null>>;
  selectedGroup: number | null;
  token: string;
  onConciliated: () => void;
  dateInitial: string;
}) {
  const [salesDivergentes, setSalesDivergentes] = useState<
    ConciliacaoDivergenteItem[]
  >([]);
  const [selectedItems, setSelectedItems] = useState<
    ConciliacaoDivergenteItem[]
  >([]);

  const [motivo, setMotivo] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [dateSelected, setDateSelected] = useState<Date | undefined>();
  const [open, setOpen] = useState(false);

  const getGruposPendentes = async (date?: Date) => {
    const formattedDate = date ? date.toISOString().split("T")[0] : dateInitial;

    const res = await fetch(
      `http://localhost:4000/conciliacao/divergentes?date=${formattedDate}`,
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
      getGruposPendentes(dateSelected);
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
      return false;
    }

    await res.json();
    return true;
  };

  function toggleItem(item: ConciliacaoDivergenteItem) {
    if (item.grupoId === selectedGroup) return;

    setSelectedItems((prev) => {
      const exists = prev.some((i) => i.grupoId === item.grupoId);

      if (exists) {
        return prev.filter((i) => i.grupoId !== item.grupoId);
      }

      return [...prev, item];
    });
  }

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
          Selecione as vendas para conciliação clicando em cima delas. <br />O
          ideal é que a diferença total se torne R$0,00
        </DialogDescription>

        <DialogHeader>
          <div className="flex justify-center">
            <ToastContainer />
          </div>

          <div className="py-2 flex justify-between px-10">
            {/* 📅 Calendário */}
            <div className="w-1/2">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-56 justify-between font-normal"
                  >
                    {dateSelected
                      ? dateSelected.toLocaleDateString()
                      : "Selecionar data"}
                    <ChevronDownIcon />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateSelected}
                    onSelect={(date) => {
                      setDateSelected(date);
                      getGruposPendentes(date); // 🔥 chama direto
                      setOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 💰 Diferença */}
            <span
              className={`${
                Number(diferenca) === 0 ? "text-green-600" : "text-red-600"
              } text-3xl font-bold`}
            >
              R$ {diferenca.toFixed(2)}
            </span>
          </div>
        </DialogHeader>

        {selectedGroup && (
          <div className="relative h-[50vh] overflow-y-auto">
            <ConciliacaoTable
              data={salesDivergentes}
              onRowClick={toggleItem}
              isSelected={(i) =>
                selectedItems.some((s) => s.grupoId === i.grupoId)
              }
              disabled={(i) => i.grupoId === selectedGroup}
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

              if (!conciliacaoId) {
                setLoading(false);
                return;
              }

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
