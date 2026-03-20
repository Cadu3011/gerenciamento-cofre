"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDownIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useEffect, useState } from "react";
import { type DateRange } from "react-day-picker";

export function FilterDateRange() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);

  // ✅ parse sem bug de timezone
  function parseDate(dateString?: string) {
    if (!dateString) return undefined;
    const [y, m, d] = dateString.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function formatDate(date: Date) {
    return date.toLocaleDateString("en-CA"); // yyyy-mm-dd
  }

  // 📌 valores da URL
  const start = searchParams.get("startDate") ?? undefined;
  const end = searchParams.get("endDate") ?? undefined;

  // ✅ estado LOCAL (interação)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: parseDate(start),
    to: parseDate(end),
  });

  // 🔁 sincroniza se URL mudar
  useEffect(() => {
    setDateRange({
      from: parseDate(start),
      to: parseDate(end),
    });
  }, [start, end]);

  function applyRange(range: DateRange | undefined) {
    if (!range?.from || !range?.to) return;

    const params = new URLSearchParams(searchParams.toString());

    params.set("startDate", formatDate(range.from));
    params.set("endDate", formatDate(range.to));

    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className="w-48 justify-between font-normal"
          >
            {dateRange?.from && dateRange?.to ? (
              <div>
                {dateRange.from.toLocaleDateString()} -{" "}
                {dateRange.to.toLocaleDateString()}
              </div>
            ) : (
              "Selecione um período"
            )}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={(range) => {
              setDateRange(range); // atualiza o estado local
              applyRange(range); // aplica o intervalo e atualiza a URL
            }}
            numberOfMonths={2}
            className="rounded-lg border shadow-sm"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
