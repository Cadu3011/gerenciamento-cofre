"use client";

import { getVendasCaixas, pushValueSangria } from "@/app/api/post";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useRef, useState } from "react";
import { useCofreFisic } from "./cofreContext";

export default function Sangrias() {
  const [vendas, setVendas] = useState<any[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const { refresh, updatedAt } = useCofreFisic();

  const debounceTimeout = useRef<Record<string, NodeJS.Timeout>>({});

  const handleInputChange = (value: string, caixa: number, moveId?: number) => {
    const key = `${caixa}-${moveId ?? "null"}`;

    setInputValues((prev) => ({ ...prev, [key]: value }));

    if (debounceTimeout.current[key]) {
      clearTimeout(debounceTimeout.current[key]);
    }

    debounceTimeout.current[key] = setTimeout(() => {
      handleSend(value, caixa, moveId);
    }, 1000);
  };

  const handleSend = async (value: string, caixa: number, moveId?: number) => {
    const finalValue = value === "" ? "0" : value;
    await pushValueSangria(finalValue, String(caixa), moveId);
    refresh();
  };

  useEffect(() => {
    const fetchVendas = async () => {
      const resVendasDin = await getVendasCaixas();
      console.log(resVendasDin);
      setVendas(resVendasDin);
    };

    fetchVendas();
  }, [updatedAt]);

  return (
    <Table className="w-full ">
      <TableHeader className="bg-gray-300 sticky top-0 z-10">
        <TableRow className="sticky top-0 z-10">
          <TableHead className="text-black text-md">Caixa</TableHead>
          <TableHead className="text-black text-md">Vendas</TableHead>
          <TableHead className="text-black text-md">Total Contado</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody className="border rounded-sm">
        {vendas.map((venda, index) => {
          const rowKey = `${venda.numCaixa}-${venda.moveId ?? "null"}`;

          return (
            <TableRow
              key={rowKey}
              className={
                index % 2 === 0
                  ? "bg-white hover:bg-zinc-400"
                  : "bg-gray-300 hover:bg-zinc-400"
              }
            >
              <TableCell>{venda.numCaixa}</TableCell>
              <TableCell>{venda.total}</TableCell>

              <TableCell>
                <Input
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
                    handleInputChange(
                      e.target.value,
                      venda.numCaixa,
                      venda.moveId,
                    );
                  }}
                  value={
                    inputValues[rowKey] ?? venda.moveValue?.toString() ?? ""
                  }
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
