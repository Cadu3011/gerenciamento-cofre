import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function LegendaConciliacao() {
  return (
    <TooltipProvider>
      <div className="flex gap-4 text-sm">
        {/* Divergente */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-4 h-4 bg-red-600 rounded" />
              <span>Divergente Trier</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Valor da Trier não encontrado na Adquirente</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-4 h-4 bg-yellow-400 rounded" />
              <span>Divergente Adquirente</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Valor da Adquirente não encontrado na Trier</p>
          </TooltipContent>
        </Tooltip>

        {/* Manual */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-4 h-4 bg-blue-200 rounded" />
              <span>Manual</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Conciliado manualmente pelo usuário</p>
          </TooltipContent>
        </Tooltip>

        {/* Conciliado único */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-4 h-4 bg-amber-800 rounded" />
              <span>Conciliado (único)</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Grupo com apenas 1 item já conciliado</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
