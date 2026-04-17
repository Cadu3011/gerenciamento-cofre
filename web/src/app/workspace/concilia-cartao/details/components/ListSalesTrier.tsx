"use client";

import { ConciCards } from "@/app/types/conciCards";
import { TableCell, TableRow } from "@/components/ui/table";
import { Dispatch, SetStateAction } from "react";

interface Props {
  sales: ConciCards;
  hoveredGroupId: number | null;
  setHoveredGroupId: Dispatch<SetStateAction<number | null>>;
  setSelectedGroup: Dispatch<SetStateAction<number | null>>;
  selectedGroup: number | null;
}

export default function ListSalesTrier({
  sales,
  hoveredGroupId,
  setHoveredGroupId,
  setSelectedGroup,
  selectedGroup,
}: Props) {
  return (
    <>
      {sales.trier.map((t) => {
        const semMatch = t.status === "DIVERGENTE";

        return (
          <TableRow
            key={t.id}
            onClick={() => setSelectedGroup(t.grupoId)}
            onMouseEnter={() => setHoveredGroupId(t.grupoId)}
            onMouseLeave={() => setHoveredGroupId(null)}
            className={`border-4 
              ${semMatch ? "bg-red-600 text-white hover:bg-red-700" : ""}
              ${
                hoveredGroupId === t.grupoId && t.qtdItensGrupo.itens > 1
                  ? "hover: border-green-500"
                  : ""
              } ${t.metodo === "MANUAL" ? "bg-blue-200 hover:bg-blue-300" : ""} ${t.qtdItensGrupo.itens === 1 && t.status === "CONCILIADO" ? "bg-amber-700 hover:bg-amber-800 " : ""}`}
          >
            <TableCell>{t.documentoFiscal}</TableCell>
            <TableCell>{t.modalidade}</TableCell>
            <TableCell>{t.bandeira}</TableCell>
            <TableCell>{t.hora}</TableCell>
            <TableCell>{Number(t.valor).toFixed(2)}</TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
