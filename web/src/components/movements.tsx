"use client";

import { deleteMoves, getMovements } from "@/app/api/post";
import { useCofreFisic } from "@/app/gerencia-cofre/components/cofreContext";
import { useEffect, useState } from "react";
interface Props {
  type: string;
  filialId: string;
  token: string;
}

export default function ExibirMovimentos({ type, filialId, token }: Props) {
  const [movements, setMovements] = useState<any>([]);
  const { refresh, updatedAt } = useCofreFisic();
  const deleteMovements = async (id: number) => {
    deleteMoves(id);
    refresh();
  };
  const fetchMovements = async () => {
    const movement = await getMovements();
    const filteredMovements = movement
      .filter((move: { type: string }) => move.type === type)
      .map((move: any) => ({
        description: move.descrition,
        value: move.value,
        type: move.type,
        id: move.id,
        status: move.status,
      }));
    setMovements(filteredMovements);
  };
  useEffect(() => {
    fetchMovements();
  }, [type, updatedAt]);
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
            <div className=" w-1/3text-center text-sm">{move.status}</div>
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
