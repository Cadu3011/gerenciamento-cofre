"use client";
import { useEffect, useState } from "react";

async function getFiliais(token: string) {
  const filiais = await fetch("http://localhost:3000/filial", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  }).then((res) => res.json());
  return filiais;
}
interface Props {
  token: string;
}
export default function ExibirFiliais({ token }: Props) {
  const [filiais, setFiliais] = useState<any>([]);
  useEffect(() => {
    const fetchFiliais = async () => {
      const filiais = await getFiliais(token);
      const filiaisFormat = await filiais.map((filial: any) => ({
        id: filial.id,
        name: filial.name,
      }));
      setFiliais(filiaisFormat);
    };
    fetchFiliais();
  }, []);

  return (
    <div className="w-full h-full bg-slate-600 flex justify-center items-center rounded-b">
      <ul className="overflow-y-auto h-full p-1 w-full">
        <div className=" flex justify-between">
          <div className="ml-3 text-white "> Filial</div>{" "}
          <div className="mr-28 text-white">ID</div>
        </div>

        {filiais.map((filial: any, index: number) => (
          <li
            key={index}
            className="flex items-center justify-between  pl-2 pr-2 bg-slate-300  mb-2 rounded"
          >
            <strong className="items-start w-1/3 mr-3">{filial.name}</strong>
            <strong> {filial.id}</strong>
            <button>Editar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
