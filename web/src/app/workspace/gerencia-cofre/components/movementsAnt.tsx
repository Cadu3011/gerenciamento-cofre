import { getMovementsAnt } from "@/app/api/post";
import { useEffect, useState } from "react";

interface Props {
  onSuccess: () => void;
}

interface Movement {
  id: number;
  descrition: string;
  value: string;
  type: string;
}

export default function MovementsAnt({ onSuccess }: Props) {
  const [groupedMovements, setGroupedMovements] = useState<
    Record<string, Movement[]>
  >({});

  const getData = async () => {
    const movementAnt = await getMovementsAnt();

    const filtered = movementAnt.map((move: any) => ({
      id: move.id,
      descrition: move.descrition,
      value: move.value,
      type: move.type,
    }));

    const grouped = filtered.reduce(
      (acc: Record<string, Movement[]>, curr: Movement) => {
        if (!acc[curr.type]) {
          acc[curr.type] = [];
        }
        acc[curr.type].push(curr);
        return acc;
      },
      {}
    );

    setGroupedMovements(grouped);
  };

  useEffect(() => {
    getData();
  }, []);

  return (
    <div className="p-4 bg-slate-200 border border-black">
      <div className="mb-4 flex justify-end">
        <button
          onClick={onSuccess}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-4 rounded"
        >
          Fechar
        </button>
      </div>

      {Object.entries(groupedMovements).map(([type, movements]) => (
        <div key={type} className="mb-6">
          <h2 className="text-xl font-bold mb-2">{type}</h2>
          <table className="table-auto w-full border border-collapse border-slate-400">
            <thead>
              <tr className="bg-slate-300">
                <th className="border px-4 py-2">Descrição</th>
                <th className="border px-4 py-2">Valor</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((move) => (
                <tr key={move.id}>
                  <td className="border px-4 py-2">{move.descrition}</td>
                  <td className="border px-4 py-2">
                    R$ {parseFloat(move.value).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
