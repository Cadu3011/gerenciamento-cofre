"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import ListSalesTrier from "./ListSalesTrier";
import ListSalesAdquirentes from "./ListSalesAdquirentes";
import { ConciCards } from "@/app/types/conciCards";
import DialogSearchConciCards from "./DialogSearchConciCards";
import DialogGrupoConciliado from "./DialogGrupoConciliado";
import { useRouter } from "next/navigation";
import { LegendaConciliacao } from "./LegendaConci";
import { formatDate } from "@/app/admin/dashboard/utils";

export default function TablesClient({
  data,
  date,
  token,
}: {
  data: ConciCards;
  date: string;
  token: string;
}) {
  const router = useRouter();

  const reloadData = () => {
    router.refresh();
  };
  const [hoveredGroupId, setHoveredGroupId] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const groupMap = new Map();

  [...data.trier, ...data.outros].forEach((item) => {
    groupMap.set(item.grupoId, item);
  });

  const selectedGroupData = selectedGroup ? groupMap.get(selectedGroup) : null;

  const isConciliado = selectedGroupData?.status === "CONCILIADO";
  return (
    <div className="flex flex-col justify-center items-center w-full">
      <div className="w-full px-10 py-5 flex justify-between  bg-blue-950  font-bold">
        <div className="bg-white p-2  rounded-md">
          <p className="text-3xl">{formatDate(date)}</p>
          <p className="text-3xl">a</p>
        </div>

        <div className="bg-white p-10 w-1/2 flex justify-center items-center rounded-md">
          <LegendaConciliacao />
        </div>
      </div>

      <div className="relative w-full h-[600px] overflow-y-auto border">
        <div className="flex w-full px-4 divide-x">
          {/* TRIER */}
          <Table className="w-full" noWrapper>
            <TableHeader className="bg-blue-950 sticky top-0 z-20">
              <TableRow>
                <TableHead colSpan={5} className="text-white text-lg">
                  Trier
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="text-white text-lg">Cod Venda</TableHead>
                <TableHead className="text-white text-lg">Modalidade</TableHead>
                <TableHead className="text-white text-lg">Bandeira</TableHead>
                <TableHead className="text-white text-lg w-20">Hora</TableHead>
                <TableHead className="text-white text-lg w-20">Valor</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              <ListSalesTrier
                sales={data}
                hoveredGroupId={hoveredGroupId}
                setHoveredGroupId={setHoveredGroupId}
                selectedGroup={selectedGroup}
                setSelectedGroup={setSelectedGroup}
              />
            </TableBody>
          </Table>

          {/* ADQUIRENTES */}
          <Table className="w-full" noWrapper>
            <TableHeader className="bg-blue-950 sticky top-0 z-10">
              <TableRow>
                <TableHead colSpan={5} className="text-white text-lg">
                  Adquirentes
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="text-white text-lg">hora</TableHead>
                <TableHead className="text-white text-lg">Valor</TableHead>
                <TableHead className="text-white text-lg">Origem</TableHead>
                <TableHead className="text-white text-lg w-20">
                  Modalidade
                </TableHead>
                <TableHead className="text-white text-lg w-20">
                  Bandeira
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              <ListSalesAdquirentes
                sales={data}
                hoveredGroupId={hoveredGroupId}
                setHoveredGroupId={setHoveredGroupId}
                selectedGroup={selectedGroup}
                setSelectedGroup={setSelectedGroup}
              />
            </TableBody>
          </Table>
        </div>
      </div>
      {selectedGroup &&
        (isConciliado ? (
          <DialogGrupoConciliado
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            token={token}
          />
        ) : (
          <DialogSearchConciCards
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            token={token}
            date={date}
            onConciliated={reloadData}
          />
        ))}
    </div>
  );
}
