"use client";

import { deleteMoves, getMovements, pushValueSangria } from "@/app/api/post";
import { useCofreFisic } from "@/app/gerencia-cofre/components/cofreContext";
import { useEffect, useRef, useState } from "react";

interface Props {
  type: string;
  filialId: string;
  token: string;
}

export default function ExibirMovimentos({ type, filialId, token }: Props) {
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const { refresh, updatedAt } = useCofreFisic();
  const [inputValues, setInputValues] = useState<Record<number, string>>({});
  const debounceTimeout = useRef<Record<number, NodeJS.Timeout>>({});

  const handleInputChange = (id: number, value: string) => {
    setInputValues((prev) => ({ ...prev, [id]: value }));

    // Limpa qualquer timeout anterior para esse input
    if (debounceTimeout.current[id]) clearTimeout(debounceTimeout.current[id]);

    // Cria um novo timeout de 1 segundo
    debounceTimeout.current[id] = setTimeout(() => {
      handleSend(id, value);
    }, 1000);
  };
  const deleteMovements = async (id: number) => {
    setLoadingId(id);
    try {
      await deleteMoves(id);
      refresh();
    } catch (err) {
      console.error("Erro ao deletar:", err);
    } finally {
      setLoadingId(null);
    }
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
          id: move.id,
          valueSangriaTrier: move.valueSangriaTrier,
          status: move.status,
        };
        return baseData;
      });

    setMovements(filteredMovements);
    const initialValues: Record<number, string> = {};
    filteredMovements.forEach((move: any) => {
      console.log(move.value);
      if (move.value === "0") {
        initialValues[move.id] = "";
      }
      initialValues[move.id] = String(move.value ?? "");
    });
    setInputValues(initialValues);
  };

  useEffect(() => {
    fetchMovements();
  }, [type, updatedAt]);
  const handleSend = async (id: number, value: string) => {
    if (value === "") {
      value = "0";
      await pushValueSangria(id, value);
      refresh();
    }
    await pushValueSangria(id, value);
    refresh();
  };
  return (
    <div className="  max-w-full">
      <table className=" w-full border border-gray-300 border-collapse text-sm ">
        <thead>
          <tr className="bg-gray-200">
            {type === "SANGRIA" && (
              <>
                <th className="border border-gray-300 px-4 py-2 text-center">
                  Caixa
                </th>

                <th className="border border-gray-300 px-4 py-2 text-center">
                  Total Vendas
                </th>
                <th className="border border-gray-300 px-4 py-2 text-center">
                  Total Dinheiro
                </th>
              </>
            )}
            {type !== "SANGRIA" && (
              <>
                <th className="border border-gray-300 px-4 py-2 text-center">
                  Descrição
                </th>
                <th className="border border-gray-300 px-4 py-2 text-center">
                  Valor
                </th>
                <th className="border border-gray-300 px-1 py-2 text-center">
                  Ações
                </th>
              </>
            )}
            {type !== "OUTRAS_ENTRADAS" && type !== "SANGRIA" && (
              <th className="border border-gray-300 px-4 py-2 text-center">
                Status
              </th>
            )}
          </tr>
        </thead>
        <tbody className="">
          {movements.map((move) => (
            <tr key={move.id} className="bg-white hover:bg-gray-50 ">
              <td className="border border-gray-300 px-4 py-2 text-center">
                {move.description}
              </td>

              {type === "SANGRIA" && (
                <>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {move.valueSangriaTrier}
                  </td>

                  <td className="border border-gray-300 px-1 py-2 text-center flex">
                    R$
                    <input
                      type="number"
                      className="w-full text-center px-1 py-1 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={inputValues[move.id] ?? ""}
                      onChange={(e) =>
                        handleInputChange(move.id, e.target.value)
                      }
                    />
                  </td>
                </>
              )}

              {type !== "SANGRIA" && (
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {move.value}
                </td>
              )}
              {type !== "OUTRAS_ENTRADAS" && type !== "SANGRIA" && (
                <td className="border border-gray-300  py-2 text-center">
                  {move.status === "SINCRONIZADO" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="20"
                      width="25"
                      viewBox="0 0 640 640"
                    >
                      <path
                        fill="#1eff00"
                        d="M530.8 134.1C545.1 144.5 548.3 164.5 537.9 178.8L281.9 530.8C276.4 538.4 267.9 543.1 258.5 543.9C249.1 544.7 240 541.2 233.4 534.6L105.4 406.6C92.9 394.1 92.9 373.8 105.4 361.3C117.9 348.8 138.2 348.8 150.7 361.3L252.2 462.8L486.2 141.1C496.6 126.8 516.6 123.6 530.9 134z"
                      />
                    </svg>
                  )}

                  {move.status === "PENDENTE" && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="20"
                      width="20"
                      viewBox="0 0 640 640"
                    >
                      <path
                        fill="#575757"
                        d="M320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z"
                      />
                    </svg>
                  )}
                </td>
              )}
              {type !== "SANGRIA" && (
                <td className="border border-gray-300 px-1 py-2 text-center">
                  <button
                    onClick={() => deleteMovements(move.id)}
                    disabled={loadingId === move.id}
                    className={`p-1 rounded transition ${
                      loadingId === move.id
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-red-50"
                    }`}
                  >
                    {loadingId === move.id ? (
                      <svg
                        className="animate-spin h-5 w-5 text-yellow-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        ></path>
                      </svg>
                    ) : (
                      <img
                        width="18"
                        height="18"
                        src="https://img.icons8.com/material-rounded/18/FA5252/full-trash.png"
                        alt="full-trash"
                      />
                    )}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
