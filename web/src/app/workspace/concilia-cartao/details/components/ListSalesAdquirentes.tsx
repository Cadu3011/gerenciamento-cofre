"use client";
import { ConciCards } from "@/app/types/conciCards";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Dispatch, SetStateAction } from "react";

interface Props {
  sales: ConciCards;
  hoveredGroupId: number | null;
  setHoveredGroupId: Dispatch<SetStateAction<number | null>>;
  setSelectedGroup: Dispatch<SetStateAction<number | null>>;
  selectedGroup: number | null;
}

export default function ListSalesAdquirentes({
  sales,
  hoveredGroupId,
  setHoveredGroupId,
  setSelectedGroup,
  selectedGroup,
}: Props) {
  return (
    <>
      {sales.outros.map((adq) => {
        const semMatch = adq.status === "DIVERGENTE";
        return (
          <TableRow
            key={adq.id}
            onClick={() => setSelectedGroup(adq.grupoId)}
            onMouseEnter={() => setHoveredGroupId(adq.grupoId)}
            onMouseLeave={() => setHoveredGroupId(null)}
            className={` border-4 text-nowrap
              ${semMatch ? "bg-yellow-400 text-black font-bold hover:bg-yellow-500 " : ""}
              ${hoveredGroupId === adq.grupoId && adq.qtdItensGrupo.itens > 1 ? "hover: border-green-500" : ""} 
              ${adq.metodo === "MANUAL" ? "bg-blue-200 hover:bg-blue-300" : ""} 
              ${adq.qtdItensGrupo.itens === 1 && adq.status === "CONCILIADO" ? "bg-amber-700 hover:bg-amber-800 " : ""}`}
          >
            <TableCell>{adq.hora}</TableCell>
            <TableCell>{adq.valor}</TableCell>
            <TableCell>{adq.origem}</TableCell>
            <TableCell>{adq.modalidade}</TableCell>
            <TableCell>{adq.bandeira}</TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
