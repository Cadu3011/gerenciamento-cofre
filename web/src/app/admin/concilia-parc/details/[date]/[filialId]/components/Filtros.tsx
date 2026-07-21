"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SlidersHorizontal, ChevronDown } from "lucide-react";

const FONTES = ["TRIER", "REDE", "CIELO"] as const;
const STATUSES = ["CONCILIADO", "DIVERGENTE", "NAO_ENCONTRADO"] as const;
const DIVERGENCIAS = ["VALOR", "VL_LIQUIDO", "VENCIMENTO", "PARCELAS"] as const;
const MATCH_TYPES = ["NSU", "VALOR", "VALOR_DATA", "MANUAL", "VENDA_CONCILIADA"] as const;

const ORIGEM_COLORS: Record<string, string> = {
  TRIER: "text-blue-500",
  REDE: "text-orange-500",
  CIELO: "text-purple-500",
};

const STATUS_COLORS: Record<string, string> = {
  CONCILIADO: "text-green-600",
  DIVERGENTE: "text-yellow-500",
  NAO_ENCONTRADO: "text-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  CONCILIADO: "Conciliado",
  DIVERGENTE: "Divergente",
  NAO_ENCONTRADO: "Não Encontrado",
};

const DIV_COLORS: Record<string, string> = {
  VALOR: "text-red-500",
  VL_LIQUIDO: "text-orange-500",
  VENCIMENTO: "text-blue-500",
  PARCELAS: "text-purple-500",
};

const DIV_LABELS: Record<string, string> = {
  VALOR: "Valor",
  VL_LIQUIDO: "Vl. Liquido",
  VENCIMENTO: "Vencimento",
  PARCELAS: "Parcelas",
};

const MATCH_COLORS: Record<string, string> = {
  NSU: "text-teal-600",
  VALOR: "text-amber-600",
  VALOR_DATA: "text-indigo-600",
  MANUAL: "text-pink-600",
  VENDA_CONCILIADA: "text-cyan-600",
};

const MATCH_LABELS: Record<string, string> = {
  NSU: "NSU",
  VALOR: "Valor",
  VALOR_DATA: "Valor/Data",
  MANUAL: "Manual",
  VENDA_CONCILIADA: "Venda Conciliada",
};

interface FiltrosProps {
  activeFontes: Set<string>;
  activeStatuses: Set<string>;
  activeDivergencias: Set<string>;
  activeMatchTypes: Set<string>;
  onToggleFonte: (fonte: string) => void;
  onToggleStatus: (status: string) => void;
  onToggleDivergencia: (divergencia: string) => void;
  onToggleMatchType: (matchType: string) => void;
}

function MultiSelect({
  label,
  options,
  selected,
  onToggle,
  colorMap,
  labelMap,
}: {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  colorMap: Record<string, string>;
  labelMap?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.size === options.length;
  const summary = allSelected
    ? "Todos"
    : selected.size === 0
      ? "Nenhum"
      : [...selected].map((v) => labelMap?.[v] ?? v).join(", ");

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full h-9 px-3 rounded-md border border-gray-300 bg-white text-sm text-left hover:border-gray-400 transition-colors"
          >
            <span className="truncate text-gray-700">{summary}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[--radix-popover-trigger-width] p-2"
        >
          <div className="flex flex-col gap-1">
            {options.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2.5 cursor-pointer rounded-md px-2 py-1.5 hover:bg-gray-100 transition-colors"
              >
                <Checkbox
                  checked={selected.has(opt)}
                  onCheckedChange={() => onToggle(opt)}
                />
                <span className={`text-sm font-medium ${colorMap[opt]}`}>
                  {labelMap?.[opt] ?? opt}
                </span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function Filtros({
  activeFontes,
  activeStatuses,
  activeDivergencias,
  activeMatchTypes,
  onToggleFonte,
  onToggleStatus,
  onToggleDivergencia,
  onToggleMatchType,
}: FiltrosProps) {
  const [open, setOpen] = useState(false);

  const allFontes = activeFontes.size === FONTES.length;
  const allStatuses = activeStatuses.size === STATUSES.length;
  const allDivergencias = activeDivergencias.size === DIVERGENCIAS.length;
  const allMatchTypes = activeMatchTypes.size === MATCH_TYPES.length;
  const hasFilter = !allFontes || !allStatuses || !allDivergencias || !allMatchTypes;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-sm border transition-colors ${
            hasFilter
              ? "border-blue-400 bg-blue-900/40 text-blue-300"
              : "border-gray-600 bg-transparent text-gray-300 hover:border-gray-400"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm bg-white">
        <DialogHeader>
          <DialogTitle>Filtros</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          <MultiSelect
            label="Fonte"
            options={FONTES}
            selected={activeFontes}
            onToggle={onToggleFonte}
            colorMap={ORIGEM_COLORS}
          />

          <MultiSelect
            label="Status"
            options={STATUSES}
            selected={activeStatuses}
            onToggle={onToggleStatus}
            colorMap={STATUS_COLORS}
            labelMap={STATUS_LABELS}
          />

          <MultiSelect
            label="Divergência"
            options={DIVERGENCIAS}
            selected={activeDivergencias}
            onToggle={onToggleDivergencia}
            colorMap={DIV_COLORS}
            labelMap={DIV_LABELS}
          />

          <MultiSelect
            label="Tipo de Match"
            options={MATCH_TYPES}
            selected={activeMatchTypes}
            onToggle={onToggleMatchType}
            colorMap={MATCH_COLORS}
            labelMap={MATCH_LABELS}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
