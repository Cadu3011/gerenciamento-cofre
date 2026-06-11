"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Banknote, CreditCard, Filter, X } from "lucide-react";
import { FilterDateRange } from "./FilterDateRange";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function SidebarFilter() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex flex-col gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"ghost"}
              size={"lg"}
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
              className="inline-flex text-white h-8 w-8 items-center justify-center overflow-hidden rounded-full sm:h-10 sm:w-10"
            >
              <Filter />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-white">
            <p>Filtros</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={"/workspace/dashboard/cartoes"}>
              <Button
                variant={"ghost"}
                size={"lg"}
                aria-label="Abrir menu"
                className="inline-flex text-white h-8 w-8 items-center justify-center overflow-hidden rounded-full sm:h-10 sm:w-10"
              >
                <CreditCard />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-white">
            <p>Diferença de Cartões</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={"/workspace/dashboard/caixas"}>
              <Button
                variant={"ghost"}
                size={"lg"}
                aria-label="Abrir menu"
                className="inline-flex text-white h-8 w-8 items-center justify-center overflow-hidden rounded-full sm:h-10 sm:w-10"
              >
                <Banknote />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-white">
            <p>Diferença de Caixas</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

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
              <div className="py-20">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Fechar menu"
                    className="rounded p-1 hover:bg-zinc-800"
                  >
                    <X size={18} />
                  </button>
                </div>

                <nav className="mt-2 flex flex-col gap-4">
                  <div className=" text-center text-2xl ">
                    <p>Filtros</p>
                  </div>
                  <FilterDateRange />
                </nav>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
