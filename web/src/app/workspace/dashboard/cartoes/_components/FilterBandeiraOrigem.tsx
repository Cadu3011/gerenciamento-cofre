"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ORIGENS = ["TRIER", "REDE", "CIELO"];

export default function FilterBandeiraOrigem({
  filtros,
}: {
  filtros: Record<string, string[]>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const origem = searchParams.get("adquirente") ?? "";
  const modo = searchParams.get("bandeirasModo") ?? "incluir";
  const selected = searchParams.get("bandeiras")?.split(",").filter(Boolean) ?? [];

  const bandeiras = useMemo(() => {
    if (origem) return filtros[origem] ?? [];
    const set = new Set<string>();
    Object.values(filtros).forEach((list) => list.forEach((b) => set.add(b)));
    return [...set].sort();
  }, [filtros, origem]);

  function apply(nextOrigem: string, nextBandeiras: string[], nextModo?: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextOrigem) params.set("adquirente", nextOrigem);
    else params.delete("adquirente");

    if (nextBandeiras.length) {
      params.set("bandeiras", nextBandeiras.join(","));
      params.set("bandeirasModo", nextModo ?? modo);
    } else {
      params.delete("bandeiras");
      params.delete("bandeirasModo");
    }

    router.replace(`${pathname}?${params.toString()}`);
  }

  function onOrigemChange(value: string) {
    apply(value === "TODAS" ? "" : value, []);
  }

  function onModoChange(value: string) {
    apply(origem, selected, value);
  }

  function toggleBandeira(b: string) {
    const next = selected.includes(b)
      ? selected.filter((x) => x !== b)
      : [...selected, b];
    apply(origem, next, modo);
  }

  function removeBandeira(b: string) {
    apply(origem, selected.filter((x) => x !== b), modo);
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Fonte/Origem:</span>
        <Select value={origem || "TODAS"} onValueChange={onOrigemChange}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="TODAS">Todas</SelectItem>
            {ORIGENS.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Bandeiras:</span>
        <Select value={modo} onValueChange={onModoChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="incluir">Incluir</SelectItem>
            <SelectItem value="excluir">Excluir</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-52 justify-between">
              Selecionar...
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-2">
            <div className="space-y-2 max-h-72 overflow-auto">
              {bandeiras.map((b) => (
                <div
                  key={b}
                  className="flex items-center justify-between rounded px-2 py-1 hover:bg-accent cursor-pointer"
                  onClick={() => toggleBandeira(b)}
                >
                  <span>{b}</span>
                  {selected.includes(b) && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {selected.map((b) => (
          <Badge key={b} variant="secondary" className="flex items-center gap-1">
            {b}
            <button onClick={() => removeBandeira(b)}>✕</button>
          </Badge>
        ))}
      </div>
    </div>
  );
}