"use client";

import {
  TableBody,
  TableCell,
  TableFooter,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { getCaixas } from "@/app/api/post";
import { Input } from "@/components/ui/input";

interface Caixa {
  id: string;
  caixa: string;
  dia: string;
  operador: string;
  valor: string;
  sobra: string;
  falta: string;
  obs: string;
}
export default function ListCaixas({
  dateRange,
}: {
  dateRange: DateRange | undefined;
}) {
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  function getCurrentMonthRange() {
    const now = new Date();

    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return { from, to };
  }
  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  useEffect(() => {
    const fetchCaixas = async () => {
      let from = dateRange?.from;
      let to = dateRange?.to;

      // Se não tiver datas, usa mês atual
      if (!from || !to) {
        const currentMonth = getCurrentMonthRange();
        from = currentMonth.from;
        to = currentMonth.to;
      }
      console.log(from, to);
      const formatFrom = formatDate(from);
      const formatTo = formatDate(to);
      const res = await getCaixas(formatFrom, formatTo);
      if (dateRange && (!dateRange.from || !dateRange.to)) return;
      setCaixas(res);
    };

    fetchCaixas();
  }, [dateRange]);
  return (
    <>
      <TableBody>
        {caixas.map((c, index) => (
          <TableRow
            key={c.id}
            className={
              index % 2 === 0
                ? "bg-white hover:bg-zinc-400"
                : "bg-gray-300 hover:bg-zinc-400 "
            }
          >
            <TableCell>{c.caixa}</TableCell>
            <TableCell>{c.dia.split("T")[0]}</TableCell>
            <TableCell>{c.operador}</TableCell>
            <TableCell>{c.valor}</TableCell>
            <TableCell
              className={Number(c.sobra) > 5 ? "text-yellow-500 font-bold" : ""}
            >
              {c.sobra}
            </TableCell>

            <TableCell
              className={Number(c.falta) > 5 ? "text-red-600 font-bold" : ""}
            >
              {c.falta}
            </TableCell>
            <TableCell className="border-l-2 border-black">
              {
                <Input
                  defaultValue={c.obs ?? ""}
                  className=" border-none bg-transparent"
                />
              }
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right">$2,500.00</TableCell>
        </TableRow>
      </TableFooter>
    </>
  );
}
