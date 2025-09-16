"use client";
import { getCofresTrier } from "@/app/api/post";
import React, { useState, useRef, useEffect } from "react";

type Conta = {
  id: number;
  titulo: string;
};

interface Props {
  onSelect: (conta: Conta) => void; // callback pro pai
}
export default function ToggleDepositoTransferir({ onSelect }: Props) {
  const [isDeposito, setIsDeposito] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [contas, setContas] = useState<Conta[]>([]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getCofresTrier();

        setContas(data);
      } catch (error) {
        console.error("Erro ao buscar cofres:", error);
      }
    };
    fetchData();
  }, []);
  // Fechar lista ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Interruptor */}
      <div className="flex items-center justify-center mb-2">
        <div className="flex bg-gray-500 rounded-lg w-64">
          <button
            type="button"
            onClick={() => setIsDeposito(true)}
            className={`flex-1 rounded-lg transition ${
              isDeposito ? "bg-blue-500 text-white" : "text-white"
            }`}
          >
            Depósito
          </button>
          <button
            onClick={() => setIsDeposito(false)}
            type="button"
            className={`flex-1 rounded-lg transition ${
              !isDeposito ? "bg-blue-500 text-white" : "text-white"
            }`}
          >
            Transferir
          </button>
        </div>
      </div>

      {/* Conteúdo condicional */}
      {!isDeposito && (
        <div ref={dropdownRef} className="relative w-64 mx-auto">
          {/* Input fake */}
          <div
            className="border rounded-lg pl-2 mb-2 bg-white cursor-pointer"
            onClick={() => setOpen(!open)}
          >
            {selectedTitle ||
              "Selecione uma conta... ou mantenha vazia para o deposito"}
          </div>

          {/* Lista */}
          {open && (
            <div className="absolute w-full max-h-40 overflow-y-auto mt-1 border rounded-lg bg-white shadow z-10">
              {contas.map((conta: any) => (
                <div
                  key={conta.id}
                  onClick={() => {
                    onSelect({ id: conta.id, titulo: conta.titulo });
                    setSelectedTitle(conta.titulo);
                    setOpen(false);
                  }}
                  className={`p-2 cursor-pointer transition ${
                    selectedId === conta.id
                      ? "bg-blue-500 text-white"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {conta.titulo}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
