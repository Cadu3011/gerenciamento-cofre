"use client";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

const chartConfig = {
  percentual: { label: "Percentual", color: "#2563eb" },
} satisfies ChartConfig;

interface Props {
  data: {
    resumo: {
      totalGrupos: number;
      conciliados: number;
      divergentes: number;
      naoEncontrados: number;
      percentualConciliado: number;
      percentualDivergente: number;
    };
    ranking: { tipo: string; quantidade: number; percentual: number }[];
  };
}

const LABEL_MAP: Record<string, string> = {
  DIVERGENCIA_VALOR: "Valor",
  DIVERGENCIA_VENCIMENTO: "Vencimento",
  DIVERGENCIA_VALOR_LIQUIDO: "Valor Líquido",
  DIVERGENCIA_QUANTIDADE_PARCELAS: "Parcelas",
  PARCELAS_NAO_ENCONTRADAS: "Não Encontradas",
};

const COLOR_MAP: Record<string, string> = {
  DIVERGENCIA_VALOR: "#ef4444",
  DIVERGENCIA_VENCIMENTO: "#f97316",
  DIVERGENCIA_VALOR_LIQUIDO: "#eab308",
  DIVERGENCIA_QUANTIDADE_PARCELAS: "#84cc16",
  PARCELAS_NAO_ENCONTRADAS: "#64748b",
};

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border bg-white p-3 shadow-md">
      <p className="font-semibold">{LABEL_MAP[item.tipo] || item.tipo}</p>
      <p>Percentual: <strong>{item.percentual}%</strong></p>
      <p>Quantidade: <strong>{item.quantidade}</strong></p>
    </div>
  );
}

export default function ChartHealthDivergencias({ data }: Props) {
  const chartData = [...data.ranking]
    .sort((a, b) => b.percentual - a.percentual)
    .map((item) => ({ ...item, tipo: LABEL_MAP[item.tipo] || item.tipo }));

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <p className="text-lg font-semibold">Divergências</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Conciliados</p>
          <p className="text-2xl font-bold text-green-600">{data.resumo.percentualConciliado}%</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Divergentes</p>
          <p className="text-2xl font-bold text-red-600">{data.resumo.percentualDivergente}%</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Não Encontrados</p>
          <p className="text-2xl font-bold text-yellow-600">{data.resumo.naoEncontrados}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Total Grupos</p>
          <p className="text-2xl font-bold">{data.resumo.totalGrupos.toLocaleString("pt-BR")}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        {Object.entries(LABEL_MAP).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLOR_MAP[key] }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <ChartContainer config={chartConfig} className="w-full h-[50vh]">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 60 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
            <YAxis type="category" dataKey="tipo" width={140} tickLine={false} axisLine={false} />
            <ChartTooltip content={<CustomTooltip />} />
            <Bar dataKey="percentual" radius={4}>
              {chartData.map((entry, index) => {
                const originalTipo = Object.entries(LABEL_MAP).find(([, v]) => v === entry.tipo)?.[0];
                return <Cell key={index} fill={COLOR_MAP[originalTipo || ""] || "#64748b"} />;
              })}
              <LabelList dataKey="percentual" position="right" formatter={(value: number) => `${value.toFixed(2)}%`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
