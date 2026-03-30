"use client";

import {
  TableBody,
  TableCell,
  TableFooter,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useRef, useState } from "react";
import { DateRange } from "react-day-picker";
import { getCaixasAdmin, patchCaixa } from "@/app/api/post";
import { Input } from "@/components/ui/input";
import { formatDate } from "../../dashboard/utils/index";
import { toast, ToastContainer } from "react-toastify";

export interface Caixa {
  id: number;
  caixa: string;
  data: string;
  operador: string;
  diferenca: string;
  sobra: string;
  falta: string;
  obsConf: string;
  obsFinal: string;
}
export default function ListCaixas({
  dateRange,
  filialId,
}: {
  dateRange: DateRange | undefined;
  filialId: string;
}) {
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  function getCurrentMonthRange() {
    const now = new Date();

    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return { from, to };
  }
  function formatDateCalendar(date: Date): string {
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
      const formatFrom = formatDateCalendar(from);
      const formatTo = formatDateCalendar(to);
      const res = await getCaixasAdmin(formatFrom, formatTo, Number(filialId));
      if (dateRange && (!dateRange.from || !dateRange.to)) return;
      setCaixas(res);
    };

    fetchCaixas();
  }, [dateRange, filialId]);

  const debounceTimeout = useRef<Record<string, NodeJS.Timeout>>({});

  const handleInputChange = (field: keyof Caixa, value: string, id: number) => {
    const key = `${id}-${field}`;

    setInputValues((prev) => ({ ...prev, [key]: value }));

    if (debounceTimeout.current[key]) {
      clearTimeout(debounceTimeout.current[key]);
    }

    debounceTimeout.current[key] = setTimeout(() => {
      handleUpdate(id, { [field]: value });
    }, 1000);
  };

  async function handleUpdate(id: number, data: Partial<Caixa>) {
    try {
      await patchCaixa(id, data);
    } catch (err) {
      const showToast = () => {
        toast.error((err as Error).message);
      };
      showToast();
    }
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
            <TableCell className="">{c.caixa}</TableCell>
            <TableCell className="">
              {formatDate(c.data.split("T")[0])}
            </TableCell>
            <TableCell className="">{c.operador}</TableCell>
            <TableCell className="">{c.diferenca}</TableCell>

            <TableCell
              className={`
                ${
                  Number(c.sobra) > 5
                    ? "text-yellow-700 font-bold drop-shadow-sm"
                    : ""
                }
                  text-md  bg-yellow-200 border-l-2 border-black  
                `}
            >
              {
                <Input
                  defaultValue={c.sobra ?? ""}
                  className=" border-none bg-transparent"
                  onKeyDown={(e) => {
                    const allowed = [
                      "Backspace",
                      "Tab",
                      "ArrowLeft",
                      "ArrowRight",
                      "Delete",
                    ];

                    if (!/[0-9.,]/.test(e.key) && !allowed.includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    handleInputChange("sobra", e.target.value, c.id);
                  }}
                />
              }
            </TableCell>

            <TableCell
              className={`
                ${Number(c.falta) > 5 ? "text-red-600 font-bold" : ""}
                  text-md bg-yellow-200 
                `}
            >
              <div className="flex justify-center">
                <ToastContainer />
              </div>
              {
                <Input
                  defaultValue={c.falta ?? ""}
                  className=" border-none bg-transparent"
                  onKeyDown={(e) => {
                    const allowed = [
                      "Backspace",
                      "Tab",
                      "ArrowLeft",
                      "ArrowRight",
                      "Delete",
                    ];

                    if (!/[0-9.,]/.test(e.key) && !allowed.includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    handleInputChange("falta", e.target.value, c.id);
                  }}
                />
              }
            </TableCell>
            <TableCell className="border-l-2 border-black w-3/12">
              {c.obsConf}
            </TableCell>
            <TableCell className="border-l-2 border-black w-3/12">
              {
                <Input
                  defaultValue={c.obsFinal ?? ""}
                  className=" border-none bg-transparent"
                  placeholder="Insira a Observação"
                  onChange={(e) => {
                    handleInputChange("obsFinal", e.target.value, c.id);
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
