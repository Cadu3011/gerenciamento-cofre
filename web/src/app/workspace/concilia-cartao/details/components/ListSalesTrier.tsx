"use client";

import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Dispatch, SetStateAction } from "react";

interface Props {
  sales: any;
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
      {sales.trier.map((t: any) => {
        const semMatch = t.status === "DIVERGENTE";

        return (
          <TableRow
            key={t.id}
            onClick={() => setSelectedGroup(t.grupoId)}
            onMouseEnter={() => setHoveredGroupId(t.grupoId)}
            onMouseLeave={() => setHoveredGroupId(null)}
            className={
              hoveredGroupId === t.grupoId
                ? "hover: border-4 border-green-500"
                : ""
            }
          >
            <TableCell className={semMatch ? "bg-red-600 text-white " : ""}>
              {t.documentoFiscal}
            </TableCell>
            <TableCell className={semMatch ? "bg-red-600 text-white " : ""}>
              {t.modalidade}
            </TableCell>
            <TableCell className={semMatch ? "bg-red-600 text-white " : ""}>
              {t.bandeira}
            </TableCell>
            <TableCell className={semMatch ? "bg-red-600 text-white " : ""}>
              {t.hora}
            </TableCell>
            <TableCell className={semMatch ? "bg-red-600 text-white" : ""}>
              {Number(t.valor).toFixed(2)}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
