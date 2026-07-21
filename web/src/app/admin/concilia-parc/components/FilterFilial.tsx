"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface Filial {
  id: number;
  name: string;
}

export default function FilterFilial({ filiais }: { filiais: Filial[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filialId = searchParams.get("filialId") || "";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filialId", value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div>
      <p className="text-white font-bold text-xl">Filtrar Filiais</p>
      <Select value={filialId} onValueChange={handleChange}>
        <SelectTrigger className="w-56 bg-zinc-900 border border-none text-white">
          <SelectValue
            placeholder={
              filialId
                ? filiais.find((f) => f.id === Number(filialId))?.name
                : "Selecione uma Filial"
            }
          />
        </SelectTrigger>
        <SelectContent className="bg-black">
          {filiais.map((f) => (
            <SelectItem key={f.id} value={f.id.toString()}>
              <p className="text-white">{f.name}</p>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
