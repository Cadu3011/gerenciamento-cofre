"use client";
import { getBalanceFisics } from "@/app/api/post";
import { useBalanceFisic } from "@/app/gerencia-cofre/components/BalanceFisicContext";
import { useEffect, useState } from "react";

export default function SumValuesFisics() {
  const [SumMovements, setSumMovements] = useState<number>(0);
  const { updatedAt } = useBalanceFisic();
  useEffect(() => {
    const fetchMovements = async () => {
      const movement = await getBalanceFisics();
      const totalValue = Object.entries(movement[0])
        .filter(
          ([key]) => !["filialId", "createdAt", "updatedAt", "id"].includes(key)
        )
        .reduce((sum, [_, value]) => sum + parseFloat(value as string), 0);
      setSumMovements(totalValue);
    };

    fetchMovements();
  }, [updatedAt]);
  return <>{SumMovements}</>;
}
