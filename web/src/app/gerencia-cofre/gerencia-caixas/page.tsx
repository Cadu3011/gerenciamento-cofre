"use client";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "lucide-react";
import { getCaixas } from "@/app/api/post";
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

export default function GerenciaCaixas() {
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
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
    <div>
      <div>
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
        <TableHeader>
          <TableRow>
            <TableHead>Caixa</TableHead>
            <TableHead>Dia</TableHead>
            <TableHead>Operador</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Sobra</TableHead>
            <TableHead>Falta</TableHead>
            <TableHead>Obs</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {caixas.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.caixa}</TableCell>
              <TableCell>{c.dia.split("T")[0]}</TableCell>
              <TableCell>{c.operador}</TableCell>
              <TableCell>{c.valor}</TableCell>
              <TableCell>{c.sobra}</TableCell>
              <TableCell>{c.falta}</TableCell>
              <TableCell>{c.obs}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell className="text-right">$2,500.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
