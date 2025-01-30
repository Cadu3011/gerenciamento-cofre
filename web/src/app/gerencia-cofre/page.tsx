"use client"; 

import { useState } from "react";

interface Movement {
  desc: string;
  value: number;
}

interface Inputs {
  [key: number]: Movement;
}

interface Movements {
  [key: number]: Movement[];
}

const gridItems = [
  { id: 1, title: "Sangria" },
  { id: 2, title: "Seção 2" },
  { id: 3, title: "Seção 3" },
  { id: 4, title: "Seção 4" },
];

export default function() {
  const [movements, setMovements] = useState<Movements>({});
  const [inputs, setInputs] = useState<Inputs>({});

  const handleInputChange = (id: number, field: keyof Movement, value: string | number) => {
    setInputs((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const addMovement = (id: number) => {
    if (!inputs[id]?.desc || !inputs[id]?.value) return;
    setMovements((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), inputs[id]],
    }));
    setInputs((prev) => ({
      ...prev,
      [id]: { desc: "", value: 0 },
    }));
  };
  const removeMovement = (id: number, index: number) => {
    setMovements((prev) => {
      const newMovements = [...(prev[id] || [])];
      newMovements.splice(index, 1);
      return {
        ...prev,
        [id]: newMovements,
      };
    });
  };

  return (
    <div className="w-full min-h-screen bg-gray-200 p-8">
      <div className="w-full bg-gray-700 p-4 mt-60 ">
        <div className="grid grid-cols-4 gap-4">
          {gridItems.map((item) => (
            <div key={item.id} className="bg-gray-100 w-full aspect-[3/4] rounded p-4 flex flex-col">
              <h2 className="text-xl font-bold mb-4">{item.title}</h2>
              <div className="flex gap-1 mb-3">
                <input
                  type="text"
                  placeholder="Descrição"
                  value={inputs[item.id]?.desc || ""}
                  onChange={(e) => handleInputChange(item.id, "desc", e.target.value)}
                  className="h-10 w-1/2 border-blue-400 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 p-2"
                />
                <input
                  type="number"
                  placeholder="R$"
                  value={inputs[item.id]?.value || ""}
                  onChange={(e) => handleInputChange(item.id, "value", Number(e.target.value))}
                  className="h-10 w-1/2 border-blue-400 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 p-2"
                />
              </div>
              <button
                onClick={() => addMovement(item.id)}
                className="mt-2 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
              >
                +
              </button>
              <div className="mt-4 space-y-2">
                {(movements[item.id] || []).map((move, index) => (
                  <div key={index} className="bg-blue-200 flex rounded p-1">
                    <p className="text-gray-600 flex-grow w-1/2 pl-3">{move.desc}</p>
                    <p className="text-gray-600 flex-grow w-1/2 pr-16">R$: {move.value}</p>
                    <button onClick={() => removeMovement(item.id, index)} className="pr-2 text-red-600 bg-white pl-2 rounded-full hover:bg-red-400 transition-colors" >X</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
