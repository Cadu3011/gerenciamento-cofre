"use client";

import {
  TableBody,
  TableCell,
  TableFooter,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useRef, useState } from "react";
import { DateRange } from "react-day-picker";
import { getCaixas, postObsConf } from "@/app/api/post";
import { Input } from "@/components/ui/input";

interface Caixa {
  id: number;
  caixa: string;
  data: string;
  operador: string;
  diferenca: string;
  sobra: string;
  falta: string;
  obsConf: string;
}
export default function ListCaixas({
  dateRange,
}: {
  dateRange: DateRange | undefined;
}) {
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

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

  const debounceTimeout = useRef<Record<string, NodeJS.Timeout>>({});

  const handleInputChange = (obs: string, id: number) => {
    setInputValues((prev) => ({ ...prev, [id]: obs }));

    if (debounceTimeout.current[id]) {
      clearTimeout(debounceTimeout.current[id]);
    }

    debounceTimeout.current[id] = setTimeout(() => {
      handleObs(id, obs);
    }, 1000);
  };

  async function handleObs(id: number, obs: string) {
    await postObsConf(id, obs);
  }
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
            <TableCell>{c.data.split("T")[0]}</TableCell>
            <TableCell>{c.operador}</TableCell>
            <TableCell
              className={`
                ${
                  Number(c.sobra) > 5
                    ? "text-yellow-700 font-bold drop-shadow-sm"
                    : ""
                }
                  text-md
                `}
            >
              {c.sobra}
            </TableCell>

            <TableCell
              className={`
                ${Number(c.falta) > 5 ? "text-red-600 font-bold" : ""}
                  text-md
                `}
            >
              {c.falta}
            </TableCell>
            <TableCell className="border-l-2 border-black">
              {
                <Input
                  defaultValue={c.obsConf ?? ""}
                  className=" border-none bg-transparent"
                  placeholder="Insira a Observação"
                  onChange={(e) => {
                    handleInputChange(e.target.value, c.id);
                  }}
                />
              }
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}></TableCell>
          <TableCell className="text-right"></TableCell>
        </TableRow>
      </TableFooter>
    </>
  );
}
