"use client";

import { useState } from "react";
import InputComp from "./input";
import { handleFormSubmit } from "@/app/api/post";
import ExibirMovimentos from "./movements";
import SumMovements from "./sumMovements";
import { useCofreFisic } from "@/app/gerencia-cofre/components/cofreContext";
import CategoriasButton from "@/app/gerencia-cofre/components/categoriaButton";
import SumMovementsOpe from "./sumMovementsOpe";
import ToggleDepositoTransferir from "@/app/gerencia-cofre/components/interruptorDepAndTransf";
interface Props {
  title: string;
  type: string;
  filialId: string;
  token: string;
}

export default function CardMovements({ title, type, filialId, token }: Props) {
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [transf, seTransf] = useState<{
    id: number;
    titulo: string;
  } | null>(null);
  const [categoria, setCategoria] = useState<{
    id: number;
    descricao: string;
  } | null>(null);
  const { refresh } = useCofreFisic();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("description", description);
    formData.append("value", value);
    formData.append("type", type);
    formData.append("filialId", filialId);
    formData.append("token", token);
    if (categoria) {
      formData.append("categoriaId", String(categoria.id));
      formData.append("categoriaDesc", categoria.descricao);
    }
    if (transf) {
      formData.append("transfIdDest", String(transf.id));
    }

    await handleFormSubmit(formData);

    setDescription("");
    setValue("");
    refresh();
  };

  return (
    <div className="bg-slate-200 w-1/2 h-80 p-2 rounded shadow-blue-300 shadow-md flex flex-col justify-between transition duration-500 ease-in-out transform hover:-translate-y-1 hover:scale-100 ">
      <div>
        <div className="flex justify-center">
          <h1>{title}</h1>
        </div>
        <form className="" onSubmit={handleSubmit}>
          <div className=" h-11 pb-2 pt-2 gap-2 flex justify-center">
            <InputComp
              value={description}
              setValue={setDescription}
              placeholder="Descrição"
              type="text"
            />
            <InputComp
              value={value}
              setValue={setValue}
              placeholder="Valor"
              type="text"
            />
          </div>
          {type == "DESPESA" && <CategoriasButton onSelect={setCategoria} />}
          {type == "DEPOSITO" && (
            <ToggleDepositoTransferir onSelect={seTransf} />
          )}
          <button
            type="submit"
            className="bg-blue-500 w-full rounded p-1 text-white text-sm font-bold transition duration-75 ease-in-out transform hover:bg-blue-600"
          >
            Adicionar
          </button>
        </form>
        <div className="mb-2">
          Total:{" "}
          <SumMovementsOpe type={type} filialId={filialId} token={token} />
        </div>
        <div>
          <ExibirMovimentos type={type} filialId={filialId} token={token} />
        </div>
      </div>
    </div>
  );
}
