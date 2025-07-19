"use client";

import { apiPort } from "@/app/api/post";
import { useEffect, useState } from "react";
interface Props {
  type: string;
  filialId: string;
  token: string;
}

async function getMovements(filialId: number, token: string) {
  const Port = await apiPort();
  console.log(filialId);
  const movementList = await fetch(
    `http://localhost:${Port}/movement/operator/${filialId}`,
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
  const Port = await apiPort();
  await fetch(`http://localhost:${Port}/movement/${id}`, { method: "DELETE" });
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
            className="flex items-center justify-between  pl-2   mb-2 rounded border border-b-slate-400"
          >
            <div className="items-start w-1/3">{move.description}:</div>

            <strong className=" w-1/3 text-center">{move.value}</strong>

            <button
              onClick={() => deleteMovements(move.id)}
              className=" mr-3 text-red-600  items-end"
            >
              <img
                width="24"
                height="24"
                src="https://img.icons8.com/material-rounded/24/FA5252/full-trash.png"
                alt="full-trash"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
