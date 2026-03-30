"use client";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "lucide-react";
import ListCaixas from "./components/ListCaixas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filial } from "../dashboard/_components/FilterFilial";
import { getFiliais } from "@/app/api/post";

export default function GerenciaCaixas() {
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filialId, setFilialId] = useState<string>("");
  const [filiais, setFiliais] = useState<Filial[]>([]);
  return (
    <div className="flex flex-col justify-center mx-10 border  border-black relative max-h-[620px] overflow-auto">
      <div className="flex justify-center py-3 gap-3 bg-blue-950">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date"
              className="w-56 justify-between font-normal"
            >
              {dateRange?.from && dateRange?.to
                ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                : dateRange?.from
                  ? dateRange.from.toLocaleDateString()
                  : "Selecionar período"}
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              captionLayout="dropdown"
              onSelect={(range) => {
                setDateRange(range);

                if (range?.from && range?.to && range.to > range.from) {
                  setOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
        <div>
          <Select
            value={filialId}
            onValueChange={setFilialId}
            onOpenChange={async () => {
              setFiliais(await getFiliais());
            }}
          >
            <SelectTrigger className="w-56 bg-white border border-none">
              <SelectValue
                placeholder={
                  filialId
                    ? filiais.find((f) => f.id === Number(filialId))?.name
                    : "Selecione uma Filial"
                }
              />
            </SelectTrigger>

            <SelectContent className="bg-white">
              {filiais.map((f) => (
                <SelectItem key={f.id} value={f.id.toString()}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Table>
        <TableHeader className="bg-blue-950 sticky top-0 z-10">
          <TableRow className="sticky top-0 z-10">
            <TableHead className="text-white text-lg">Caixa</TableHead>
            <TableHead className="text-white text-lg">Data</TableHead>
            <TableHead className="text-white text-lg">Operador</TableHead>
            <TableHead className="text-white text-lg">Diferença</TableHead>
            <TableHead className="text-white text-lg">Sobra</TableHead>
            <TableHead className="text-white text-lg">Falta</TableHead>
            <TableHead className="text-white text-lg ">Obs</TableHead>
            <TableHead className="text-white text-lg ">Obs Final</TableHead>
          </TableRow>
        </TableHeader>
        <ListCaixas dateRange={dateRange} filialId={filialId} />
      </Table>
    </div>
  );
}
