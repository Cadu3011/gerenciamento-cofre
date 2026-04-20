"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { handleLogut } from "@/app/api/post";

export default function Sidebar({ role }: { role: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function submitLogout(): Promise<any> {
    handleLogut();
  }
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className="inline-flex text-white h-8 w-8 items-center justify-center overflow-hidden rounded-full sm:h-10 sm:w-10"
      >
        <Menu />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black"
              onClick={() => setOpen(false)}
            />

            <motion.aside
              key="sidebar"
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 18 }}
              className="fixed top-0 left-0 z-50 flex h-screen w-50 flex-col justify-between bg-blue-950 p-6 text-white shadow-2xl sm:w-72"
              role="dialog"
              aria-modal="true"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => submitLogout()}
                      className="flex items-center gap-2 text-red-400 transition-colors hover:text-red-500"
                    >
                      <LogOut size={16} />
                      Sair
                    </button>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Fechar menu"
                    className="rounded p-1 hover:bg-zinc-800"
                  >
                    <X size={18} />
                  </button>
                </div>

                <nav className="mt-8 flex flex-col gap-4">
                  {role === "GESTOR" && (
                    <div className="flex flex-col gap-4">
                      <Link
                        href="/admin/dashboard"
                        className="hover:text-green-400"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/admin/gerencia-filial"
                        className="hover:text-green-400"
                      >
                        Gerenciar Filiais
                      </Link>
                      <Link
                        href="/admin/conferir-caixas"
                        className="hover:text-green-400"
                      >
                        Conferir Caixas
                      </Link>
                      <Link
                        href="/admin/gerencia-usuario"
                        className="hover:text-green-400"
                      >
                        Gerenciar Usuarios
                      </Link>
                      <Link
                        href="/admin/gerenciar-cartao"
                        className="hover:text-green-400"
                      >
                        Gerenciar Cartões
                      </Link>
                      <Link
                        href="/admin/monitorar-cofres"
                        className="hover:text-green-400"
                      >
                        Monitorar Cofres
                      </Link>
                    </div>
                  )}
                  {role === "OPERADOR" && (
                    <div className="flex flex-col gap-4">
                      <Link href="/workspace" className="hover:text-green-400">
                        Workspace
                      </Link>
                      <Link
                        href="/workspace/concilia-cartao"
                        className="hover:text-green-400"
                      >
                        Conciliar Cartões
                      </Link>
                      <Link
                        href="/workspace/gerencia-caixas"
                        className="hover:text-green-400"
                      >
                        Conferir Caixas
                      </Link>
                      <Link
                        href="/workspace/pesquisa-cartao"
                        className="hover:text-green-400"
                      >
                        Pesquisar Cartões
                      </Link>
                      <Link
                        href="/workspace/gerencia-cofre"
                        className="hover:text-green-400"
                      >
                        Gerenciar Cofre
                      </Link>
                      <Link
                        href="/workspace/dashboard"
                        className="hover:text-green-400"
                      >
                        Dashboard
                      </Link>
                    </div>
                  )}
                </nav>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
