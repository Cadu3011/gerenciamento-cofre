import { useState } from "react";
import InputComp from "./input";

export function FormFilial() {
  const [nomeFilial, setNomeFilial] = useState("");
  return (
    <div className="bg-slate-500 w-full h-full flex items-center justify-center ">
      <div className="">
        <div className="text-center mb-6">Criar filial</div>

        <div className="mb-1">Nome</div>
        <div>
          <InputComp
            type="text"
            value={nomeFilial}
            setValue={setNomeFilial}
            placeholder="nome da filial"
          />
        </div>
        <div className="text-center mt-3">
          <button className="bg-blue-400 pl-3 pr-3 rounded border border-black">
            criar
          </button>
        </div>
      </div>
    </div>
  );
}
