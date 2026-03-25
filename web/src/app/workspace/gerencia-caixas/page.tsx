"use client";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "lucide-react";
import ListCaixas from "./components/ListCaixas";

export default function GerenciaCaixas() {
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  return (
    <div className="flex flex-col justify-center mx-10 border  border-black relative max-h-[620px] overflow-auto">
      <div className="flex justify-center py-3 bg-blue-950">
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
      </div>
      <Table>
        <TableHeader className="bg-blue-950 sticky top-0 z-10">
          <TableRow className="sticky top-0 z-10">
            <TableHead className="text-white text-lg">Caixa</TableHead>
            <TableHead className="text-white text-lg">Dia</TableHead>
            <TableHead className="text-white text-lg">Operador</TableHead>
            <TableHead className="text-white text-lg">Sobra</TableHead>
            <TableHead className="text-white text-lg">Falta</TableHead>
            <TableHead className="text-white text-lg ">Obs</TableHead>
          </TableRow>
        </TableHeader>
        <ListCaixas dateRange={dateRange} />
      </Table>
    </div>
  );
}
