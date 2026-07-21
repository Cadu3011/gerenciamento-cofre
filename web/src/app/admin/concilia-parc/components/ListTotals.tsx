"use client";

import { TotalsParcDay } from "@/app/types/conciParc";
import { TableCell, TableRow } from "@/components/ui/table";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { formatDate } from "../../dashboard/utils";
import Link from "next/link";

export interface Props {
  totalsParcDay: TotalsParcDay[];
  filialId: number;
  error?: string | null;
}

export default function ListTotals({ totalsParcDay, filialId, error }: Props) {
  useEffect(() => {
    if (error) {
      toast.error(`Erro ao carregar dados: ${error}`);
    }
  }, [error]);

  return (
    <>
      {totalsParcDay.map((t) => (
        <TableRow key={t.data} className="text-xl">
          <TableCell>{formatDate(t.data)}</TableCell>
          <TableCell className="text-green-700 font-bold">
            {t.conciliados}
          </TableCell>
          <TableCell
            className={`font-bold ${
              t.divergentes > 0 ? "text-red-500" : "text-green-600"
            }`}
          >
            {t.divergentes}
          </TableCell>
          <TableCell
            className={`font-bold ${
              t.naoEncontrados > 0 ? "text-red-500" : "text-green-600"
            }`}
          >
            {t.naoEncontrados}
          </TableCell>
          <TableCell>
            <Link
              href={`/admin/concilia-parc/details/${t.data}/${filialId}`}
              className="text-2xl"
            >
              ...
            </Link>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
