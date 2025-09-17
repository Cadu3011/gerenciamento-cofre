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
  .map((move: any) => {
    const baseData = {
      description: move.descrition,
      value: move.value,
      type: move.type,
      id: move.id
    };
    
    
    if (move.type !== "SANGRIA" && move.type !== "OUTRAS_ENTRADAS") {
      return {
        ...baseData,
        status: move.status
      };
    }
    
    return baseData;
  });
    setMovements(filteredMovements);
  };
  useEffect(() => {
    fetchMovements();
  }, [type, updatedAt]);
  return (
   <div>
  <ul className="overflow-y-auto max-h-40 divide-y divide-gray-200">
    {movements.map((move: any, index: number) => (
      <li
        key={index}
        className="flex items-center justify-between px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition text-sm"
      >
        <div className="w-1/3 truncate text-black">{move.description}</div>

        <strong className="w-1/3 text-center text-black">{move.value}</strong>

        <div className="w-1/3 flex justify-center items-center">
          {move.status === "SINCRONIZADO" ? (
            <svg xmlns="http://www.w3.org/2000/svg" height="20" width="25" viewBox="0 0 640 640"><path fill="#1eff00" d="M530.8 134.1C545.1 144.5 548.3 164.5 537.9 178.8L281.9 530.8C276.4 538.4 267.9 543.1 258.5 543.9C249.1 544.7 240 541.2 233.4 534.6L105.4 406.6C92.9 394.1 92.9 373.8 105.4 361.3C117.9 348.8 138.2 348.8 150.7 361.3L252.2 462.8L486.2 141.1C496.6 126.8 516.6 123.6 530.9 134z"/></svg>
          ) : move.status === "PENDENTE" ? (
            <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 640 640"><path fill="#575757" d="M320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z"/></svg>
          ) : (
            <span className="text-gray-500">{move.status}</span>
          )}
        </div>

        <button
          onClick={() => deleteMovements(move.id)}
          className="ml-2 p-1 rounded hover:bg-red-50 transition"
        >
          <img
            width="18"
            height="18"
            src="https://img.icons8.com/material-rounded/18/FA5252/full-trash.png"
            alt="full-trash"
          />
        </button>
      </li>
    ))}
  </ul>
</div>


  );
}
