"use client";

import { useState } from "react";
import InputComp from "./input";
import { handleFormSubmit } from "@/app/api/post";
import ExibirMovimentos from "./movements";
interface Props {
  title: string;
  type: string;
}

export default function CardMovements({ title, type }: Props) {
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("description", description);
    formData.append("value", value);
    formData.append("type", type);

    await handleFormSubmit(formData);
    window.location.reload();
    setDescription("");
    setValue("");
  };

  return (
    <div className="bg-slate-200 w-full h-80 p-2 rounded shadow-blue-300 shadow-md flex flex-col justify-between transition duration-500 ease-in-out transform hover:-translate-y-1 hover:scale-100 ">
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

          <button type="submit" className="bg-blue-400 w-full rounded-lg">
            +
          </button>
        </form>
      </div>
      <ExibirMovimentos type={type} />
      <div className="">Total:</div>
    </div>
  );
}
