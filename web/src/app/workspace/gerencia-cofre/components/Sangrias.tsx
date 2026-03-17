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
  const [inputValues, setInputValues] = useState<Record<number, string>>({});
  const { refresh, updatedAt } = useCofreFisic();

  const debounceTimeout = useRef<Record<number, NodeJS.Timeout>>({});

  const handleInputChange = (id: number, value: string, caixa: string) => {
    setInputValues((prev) => ({ ...prev, [id]: value }));

    if (debounceTimeout.current[id]) clearTimeout(debounceTimeout.current[id]);

    debounceTimeout.current[id] = setTimeout(() => {
      handleSend(id, value, caixa);
    }, 1000);
  };

  const handleSend = async (id: number, value: string, caixa: string) => {
    const finalValue = value === "" ? "0" : value;

    await pushValueSangria(id, finalValue, caixa);
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
      <TableBody className="border  rounded-sm">
        {vendas.map((venda, index) => (
          <TableRow
            key={venda.numCaixa}
            className={
              index % 2 === 0
                ? "bg-white hover:bg-zinc-400"
                : "bg-gray-300 hover:bg-zinc-400 "
            }
          >
            <TableCell>{venda.numCaixa}</TableCell>
            <TableCell>{venda._sum.valor}</TableCell>
            <TableCell>
              <Input
                onChange={(e) => {
                  handleInputChange(
                    venda.numCaixa,
                    e.target.value,
                    venda.numCaixa,
                  );
                }}
                value={inputValues[venda.numCaixa] ?? ""}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
