"use client";

import { useEffect, useState } from "react";
interface Props {
  type: string;
  filialId: string;
  token: string;
}
async function getMovements(filialId: number, token: string) {
  const movementList = await fetch(
    `http://localhost:3000/movement/operator/${filialId}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Passa o token no header
      },
    }
  ).then((res) => res.json());
  return movementList;
}
async function deleteMovements(id: number) {
  await fetch(`http://localhost:3000/movement/${id}`, { method: "DELETE" });
  window.location.reload();
}
export default function ExibirMovimentos({ type, filialId, token }: Props) {
  const [movements, setMovements] = useState<any>([]);
  useEffect(() => {
    const fetchMovements = async () => {
      const movement = await getMovements(Number(filialId), token);
      const filteredMovements = movement
        .filter((move: { type: string }) => move.type === type)
        .map((move: any) => ({
          description: move.descrition,
          value: move.value,
          type: move.type,
          id: move.id,
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
            className="flex items-center justify-between  pl-2 bg-slate-300  mb-2 rounded"
          >
            <strong className="items-start w-1/3">
              Desc: {move.description}
            </strong>

            <strong className="items-center w-1/3">Valor: {move.value}</strong>

            <button
              onClick={() => deleteMovements(move.id)}
              className=" mr-3 text-red-500 rounded-full w-6 items-end"
            >
              X
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
