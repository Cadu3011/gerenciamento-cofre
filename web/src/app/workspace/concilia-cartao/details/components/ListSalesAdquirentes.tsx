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

export default function ListSalesAdquirentes({
  sales,
  hoveredGroupId,
  setHoveredGroupId,
  setSelectedGroup,
  selectedGroup,
}: Props) {
  return (
    <>
      {sales.outros.map((adq: any) => {
        const semMatch = adq.status === "DIVERGENTE";
        return (
          <TableRow
            key={adq.id}
            onClick={() => setSelectedGroup(adq.grupoId)}
            onMouseEnter={() => setHoveredGroupId(adq.grupoId)}
            onMouseLeave={() => setHoveredGroupId(null)}
            className={
              hoveredGroupId === adq.grupoId
                ? "hover: border-4 border-green-500"
                : ""
            }
          >
            <TableCell
              className={semMatch ? "bg-yellow-400 text-black font-bold " : ""}
            >
              {adq.hora}
            </TableCell>
            <TableCell
              className={semMatch ? "bg-yellow-400 text-black font-bold " : ""}
            >
              {adq.valor}
            </TableCell>
            <TableCell
              className={semMatch ? "bg-yellow-400 text-black font-bold " : ""}
            >
              {adq.origem}
            </TableCell>
            <TableCell
              className={semMatch ? "bg-yellow-400 text-black font-bold " : ""}
            >
              {adq.modalidade}
            </TableCell>
            <TableCell
              className={semMatch ? "bg-yellow-400 text-black font-bold " : ""}
            >
              {adq.bandeira}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
