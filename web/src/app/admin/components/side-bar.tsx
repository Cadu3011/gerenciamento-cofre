"use client";

import { handleLogut } from "@/app/api/post";
import { useState } from "react";

export function SideBar({ children }: { children: React.ReactNode }) {
  async function submitLogout(): Promise<any> {
    handleLogut();
  }
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="h-full w-full flex items-center ">
      <div
        className={`bg-blue-950 h-full space-y-3 transition-all ${
          isOpen ? "w-40" : "w-0"
        } overflow-hidden `}
      >
        <div className="flex justify-center mt-2">
          <button className="bg-slate-400 rounded p-2" onClick={submitLogout}>
            sair
          </button>
        </div>
        <div className="mt-10 pt-1 pl-2 pb-1 bg-slate-400">
          <a href="/admin/gerencia-filial">gerenciar filiais</a>
        </div>
        <div className="pt-1 pl-2 pb-1 bg-slate-400">
          <a href="/admin/gerencia-usuario">gerenciar usuarios</a>
        </div>
        <div className="pt-1 pl-2 pb-1 bg-slate-400">
          <a href="/admin/monitorar-cofres">monitorar cofres</a>
        </div>
      </div>
      <div>
        <button
          className="absolute bg-blue-800 rounded-r-lg h-14 flex items-center "
          onClick={() => {
            setIsOpen(!isOpen);
          }}
        >
          {isOpen ? "<" : ">"}
        </button>
      </div>
      <div className=" h-full w-full flex justify-center">{children}</div>
    </div>
  );
}
