"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { getFiliais } from "@/app/api/post";

interface Filial {
  id: number;
  name: string;
}

export default function FilterFilial() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filiais, setFiliais] = useState<Filial[]>([]);

  const filialId = searchParams.get("filialId") || "";

  useEffect(() => {
    getFiliais().then(setFiliais);
  }, []);

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("filialId", value);

    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <Select value={filialId} onValueChange={handleChange}>
      <SelectTrigger className="w-56 bg-white">
        <SelectValue
          placeholder={
            filialId
              ? filiais.find((f) => f.id === Number(filialId))?.name
              : "Filial"
          }
        />
      </SelectTrigger>

      <SelectContent>
        {filiais.map((f) => (
          <SelectItem key={f.id} value={f.id.toString()}>
            {f.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
