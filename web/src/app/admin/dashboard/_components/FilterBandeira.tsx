"use client";

import { useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export default function FilterBandeira({
  bandeiras,
  defaultExcluded,
}: {
  bandeiras: string[];
  defaultExcluded?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const bandeirasValidas = bandeiras.filter(Boolean);

  const excluded =
    searchParams.get("bandeiras")?.split(",").filter(Boolean) ??
    defaultExcluded ??
    [];

  const [selected, setSelected] = useState<string[]>(excluded);

  const removeExclude = useCallback(
    (b: string) => {
      const params = new URLSearchParams(searchParams.toString());

      const next = excluded.filter((x) => x !== b);

      if (next.length) params.set("bandeiras", next.join(","));
      else params.delete("bandeiras");

      router.replace(`${pathname}?${params.toString()}`);
      setSelected(next);
    },
    [excluded, pathname, router, searchParams],
  );

  function onOpenChange(open: boolean) {
    if (open) {
      setSelected(excluded);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (selected.length) params.set("bandeiras", selected.join(","));
    else params.delete("bandeiras");

    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold">Excluir bandeira:</span>

      <Popover onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-52 justify-between">
            Selecionar...
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-60 p-2">
          <div className="space-y-2 max-h-72 overflow-auto">
            {bandeirasValidas.map((b) => (
              <div
                key={b}
                className="flex items-center justify-between rounded px-2 py-1 hover:bg-accent cursor-pointer"
                onClick={() =>
                  setSelected((prev) =>
                    prev.includes(b)
                      ? prev.filter((x) => x !== b)
                      : [...prev, b],
                  )
                }
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

      {excluded.map((b) => (
        <Badge key={b} variant="secondary" className="flex items-center gap-1">
          {b}
          <button onClick={() => removeExclude(b)}>✕</button>
        </Badge>
      ))}
    </div>
  );
}
