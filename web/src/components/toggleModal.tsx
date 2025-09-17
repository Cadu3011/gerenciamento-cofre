"use client";

import FormBalanceFisic from "@/app/gerencia-cofre/components/form-balanceFisic";
import MovementsAnt from "@/app/gerencia-cofre/components/movementsAnt";
import { useState } from "react";

export default function ToggleModalClient() {
  const [showForm, setShowForm] = useState(true);
  const [showMoveAnt, setShowMoveAnt] = useState(false);
  return (
    <>
      <div className="">
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 w-60 p-2 mr-2 flex justify-center rounded-b-lg text-white font-bold  text-center transition duration-75 ease-in-out transform hover:bg-blue-600"
        >
          Editar Valores Fisicos
        </button>
      </div>

      {showForm && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white  rounded-xl relative w-[100%] max-w-md">
            {/* Passa a função para fechar o modal */}
            <FormBalanceFisic onSuccess={() => setShowForm(false)} />
          </div>
        </div>
      )}

      <div className="">
        <button
          onClick={() => setShowMoveAnt(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 w-60 p-2 mr-2 flex justify-center rounded-b-lg text-white font-bold  text-center transition duration-75 ease-in-out transform hover:bg-blue-600"
        >
          Movimentos Anteriores
        </button>
      </div>

      {showMoveAnt && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white  rounded-xl relative w-[100%] max-w-md">
            {/* Passa a função para fechar o modal */}
            <MovementsAnt onSuccess={() => setShowMoveAnt(false)} />
          </div>
        </div>
      )}
    </>
  );
}
