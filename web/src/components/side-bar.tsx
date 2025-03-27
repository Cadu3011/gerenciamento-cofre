"use client";

import { useState } from "react";

export function SideBar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="h-full flex items-center">
      <div
        className={`bg-blue-950 h-full space-y-3 transition-all ${
          isOpen ? "w-40" : "w-0"
        } overflow-hidden `}
      >
        <div className="mt-10 pt-1 pl-2 pb-1 bg-slate-400">
          <a href="/gerencia-filial">gerenciar filiais</a>
        </div>
        <div className="pt-1 pl-2 pb-1 bg-slate-400">
          <a href="/gerencia-usuario">gerenciar usuarios</a>
        </div>
        <div className="pt-1 pl-2 pb-1 bg-slate-400">
          <a href="/monitorar-cofres">monitorar cofres</a>
        </div>
      </div>
      <div>
        <button
          className="bg-blue-800 h-14 flex items-center "
          onClick={() => {
            setIsOpen(!isOpen);
          }}
        >
          {isOpen ? "<" : ">"}
        </button>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
