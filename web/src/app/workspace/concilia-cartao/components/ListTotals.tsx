"use client";
import { TotalsCardsDay } from "@/app/types/conciCards";
import { TableCell, TableRow } from "@/components/ui/table";
import Decimal from "decimal.js";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { formatDate } from "../../dashboard/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export interface Props {
  totalsCardsDay: TotalsCardsDay[];
  error?: string | null;
}

export default function ListTotals({ totalsCardsDay, error }: Props) {
  useEffect(() => {
    if (error) {
      toast.error(`Erro ao carregar dados: ${error}`);
    }
  }, [error]);

  function diferencas(trier: string, rede: string, cielo: string) {
    const trierFormat = new Decimal(trier ?? 0);
    const redeFormat = new Decimal(rede ?? 0);
    const cieloFormat = new Decimal(cielo ?? 0);
    const difTotal = trierFormat.minus(redeFormat.plus(cieloFormat));
    console.log(difTotal);
    return formatNum(difTotal.toString());
  }

  function formatNum(valor: string) {
    if (!valor)
      return (0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <>
      {totalsCardsDay.map((t) => (
        <TableRow key={t.data} className="text-xl">
          <TableCell>{formatDate(t.data)}</TableCell>
          <TableCell className="text-blue-700 font-bold">
            {formatNum(t.TRIER)}
          </TableCell>
          <TableCell className="text-orange-700 font-bold">
            {formatNum(t.REDE)}
          </TableCell>
          <TableCell className="text-orange-700 font-bold">
            {formatNum(t.CIELO)}
          </TableCell>
          <TableCell className="text-yellow-600 font-bold">
            {diferencas(t.TRIER, t.REDE, t.CIELO)}
          </TableCell>
          <TableCell
            className={`${
              Number(t.totalDivergencia) > 0
                ? "text-red-500"
                : Number(t.totalDivergencia) < 0
                  ? "text-yellow-500"
                  : "text-green-600"
            } font-bold `}
          >
            {formatNum(String(t.totalDivergencia))}
          </TableCell>
          <TableCell>
            <Link
              href={`/workspace/concilia-cartao/details/${t.data}`}
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
