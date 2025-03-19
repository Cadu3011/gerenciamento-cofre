"use client";

import { useEffect, useState } from "react";

async function getMovemements() {
  const movementList = await fetch(
    "http://localhost:3000/movement/operator/3"
  ).then((res) => res.json());
  return movementList;
}
interface Props {
  type: string;
}
export default function ExibirMovimentos({ type }: Props) {
  const [movements, setMovements] = useState<any>([]);
  useEffect(() => {
    const fetchMovements = async () => {
      const movement = await getMovemements();
      const filteredMovements = movement
        .filter((move: { type: string }) => move.type === type)
        .map((move: any) => ({
          description: move.descrition,
          value: move.value,
          type: move.type,
        }));
      setMovements(filteredMovements);
    };

    fetchMovements();
  }, [type]);
  return (
    <div>
      <ul className="overflow-y-auto max-h-40 ">
        {movements.map((move: any, index: number) => (
          <li
            key={index}
            className="flex items-center justify-between gap-2  bg-slate-300  mb-2 rounded"
          >
            <div className="gap-2">
              <strong>Desc:</strong>
              {move.description}
              <strong>Valor:</strong>
              {move.value}
            </div>

            <button className="ml-20">X</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
