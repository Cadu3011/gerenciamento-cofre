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
import {
  conciliarGrupos,
  getGruposPendentes,
} from "@/app/api/cartao/conciCards";
import { FilterDateRange } from "@/app/admin/dashboard/_components/FilterDateRange";
import { useRouter, useSearchParams } from "next/navigation";
import { formatNum } from "@/app/admin/dashboard/utils";

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
  const router = useRouter();
  const [salesDivergentes, setSalesDivergentes] = useState<
    ConciliacaoDivergenteItem[]
  >([]);
  const [selectedItems, setSelectedItems] = useState<
    ConciliacaoDivergenteItem[]
  >([]);

  const [motivo, setMotivo] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [filterValue, setFilterValue] = useState("");
  const [sortOrder, setSortOrder] = useState<"default" | "asc" | "desc">(
    "default",
  );
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const searchParams = useSearchParams();

  const startDate = searchParams.get("startDate") ?? dateInitial;

  const endDate = searchParams.get("endDate") ?? dateInitial;

  const getPendentes = async () => {
    const data: ConciliacaoDivergenteItem[] = await getGruposPendentes(
      startDate ?? dateInitial,
      endDate ?? startDate ?? dateInitial,
    );

    setSalesDivergentes(data);
  };
  const clearDateFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    params.delete("startDate");
    params.delete("endDate");

    const query = params.toString();

    router.replace(query ? `?${query}` : window.location.pathname, {
      scroll: false,
    });
  };

  const filteredAndSortedData = showOnlySelected
    ? selectedItems
    : salesDivergentes
        .filter((item) => {
          if (!filterValue) return true;

          const search = filterValue.replace(",", ".");

          return item.valor.toString().includes(search);
        })
        .sort((a, b) => {
          if (sortOrder === "default") return 0;

          const valA = Number(a.valor);
          const valB = Number(b.valor);

          return sortOrder === "asc" ? valA - valB : valB - valA;
        });

  useEffect(() => {
    if (selectedGroup) {
      getPendentes();
    }
  }, [selectedGroup, startDate, endDate]);

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
    const res = await conciliarGrupos(groupIds, conciliacaoId, motivo);

    if (!res.ok) {
      const error = await res.data;
      toast.error(error.message || "Erro ao conciliar");
      return false;
    }

    await res.data;
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
  const toggleSort = () => {
    setSortOrder((prev) => {
      if (prev === "default") return "desc";
      if (prev === "desc") return "asc";
      return "default";
    });
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
          clearDateFilters();
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
          <div className="flex justify-end px-16">
            {/* 💰 Diferença */}
            <span
              className={`${
                Number(diferenca) === 0
                  ? "text-green-600"
                  : Number(diferenca) < 0
                    ? "text-yellow-600"
                    : "text-red-600"
              } text-3xl font-bold`}
            >
              {formatNum(Number(diferenca) * -1)}
            </span>
          </div>
          <div className="py-2 flex justify-between px-10">
            {/* 📅 Calendário */}
            <div className="flex gap-2">
              <FilterDateRange />

              {/* 🔎 Filtro */}
              <div>
                <p>Filtrar por Valor</p>
                <Input
                  placeholder="Filtrar por valor (ex: 10.00)"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="w-60"
                />
              </div>

              {/* 🔃 Ordenação */}
              <div>
                <p>Ordenar por:</p>{" "}
                <Button
                  variant="outline"
                  onClick={toggleSort}
                  className="bg-blue-400"
                >
                  {sortOrder === "default" && "Padrão (Hora)"}
                  {sortOrder === "desc" && "Maior → Menor"}
                  {sortOrder === "asc" && "Menor → Maior"}
                </Button>
              </div>

              <Button
                variant={showOnlySelected ? "default" : "outline"}
                onClick={() => setShowOnlySelected((prev) => !prev)}
              >
                {showOnlySelected
                  ? "Mostrando Selecionados"
                  : "Ver Selecionados"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {selectedGroup && (
          <div className="relative h-[40vh] overflow-y-auto">
            <ConciliacaoTable
              data={filteredAndSortedData}
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
              className="max-w-xl"
              placeholder="Digite a observação ou motivo"
            />
          </div>

          <Button
            className="bg-blue-700 shrink-0"
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
