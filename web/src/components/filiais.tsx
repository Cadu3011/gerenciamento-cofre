"use client";
import { useEffect, useState } from "react";
import { FormFilial } from "./form-filial";
import { apiUrl, getFiliais } from "@/app/api/post";

interface Props {
  token: string;
}
export default function ExibirFiliais() {
  const [filiais, setFiliais] = useState<any>([]);
  useEffect(() => {
    const fetchFiliais = async () => {
      const filiais = await getFiliais();
      const filiaisFormat = await filiais.map((filial: any) => ({
        id: filial.id,
        name: filial.name,
      }));
      setFiliais(filiaisFormat);
    };
    fetchFiliais();
  }, []);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full h-full relative bg-slate-600 flex justify-center items-center rounded-b">
      <div
        className={`${
          isOpen
            ? "z-10 fixed bg-slate-600 w-96 border border-black h-60 rounded"
            : "hidden"
        }`}
      >
        <FormFilial />
        <div className="flex justify-end mr-3">
          <button
            className="bg-blue-400 pl-3 pr-3 rounded border border-black"
            onClick={() => setIsOpen(!isOpen)}
          >
            voltar
          </button>
        </div>
      </div>
      <div className="z-0">
        <div className="ml-24 mr-24">Gerenciar Filiais</div>

        <div className="ml-5">
          <button
            className="bg-blue-400 pl-2 pr-2 mb-2 rounded border border-black"
            onClick={() => setIsOpen(!isOpen)}
          >
            criar
          </button>
        </div>
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
    </div>
  );
}
