"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const periodos = [
  { label: "Mensal", value: "MENSAL" },
  { label: "Bimestral", value: "BIMESTRAL" },
  { label: "Trimestral", value: "TRIMESTRAL" },
  { label: "Semestral", value: "SEMESTRAL" },
];

export default function FilterPeriodo() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const periodoAtual = searchParams.get("periodo") || "MENSAL";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("periodo", value);

    router.push(`?${params.toString()}`);
  }

  return (
    <Select value={periodoAtual} onValueChange={handleChange}>
      <SelectTrigger className="w-56 bg-zinc-900 border-none text-white h-2/3">
        <SelectValue placeholder="Selecione um período" />
      </SelectTrigger>

      <SelectContent className="bg-white">
        {periodos.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
