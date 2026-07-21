"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const items = [
  {
    color: "bg-green-500",
    label: "Conciliado sem divergência",
  },
  {
    color: "bg-yellow-400",
    label: "Conciliado com divergência",
  },
  {
    color: "bg-red-500",
    label: "Não encontrado (sem correspondente)",
  },
];

const divergences = [
  { icon: "$", label: "Valor" },
  { icon: "📅", label: "Vencimento" },
  { icon: "$L", label: "Valor Líquido" },
  { icon: "P", label: "Parcelas" },
];

export default function LegendaConci() {
  return (
    <TooltipProvider>
      <div className="flex gap-4 items-center">
        <div className="flex flex-col gap-5">
          {items.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help bg-white">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-xs text-gray-700">
                    {item.label.split(" ")[0]}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-white text-gray-700 border border-gray-300">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="w-px h-4 bg-gray-300" />
        <div className="flex gap-3">
          {divergences.map((d) => (
            <Tooltip key={d.label}>
              <TooltipTrigger asChild>
                <span className="text-xs font-bold text-gray-500 cursor-help">
                  {d.icon}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Divergência de {d.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
