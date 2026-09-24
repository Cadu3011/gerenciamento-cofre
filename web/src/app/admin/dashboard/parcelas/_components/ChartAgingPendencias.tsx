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
  quantidade: { label: "Pendências", color: "#f59e0b" },
} satisfies ChartConfig;

const COLOR_MAP: Record<string, string> = {
  "0-2 dias": "#22c55e",
  "3-7 dias": "#84cc16",
  "8-30 dias": "#f59e0b",
  "30+ dias": "#ef4444",
};

interface Props {
  data: { faixa: string; quantidade: number }[];
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border bg-white p-3 shadow-md">
      <p className="font-semibold">Aging: {item.faixa}</p>
      <p>
        Pendências: <strong>{item.quantidade.toLocaleString("pt-BR")}</strong>
      </p>
    </div>
  );
}

export default function ChartAgingPendencias({ data }: Props) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold">Aging de Pendências (idade em dias)</p>
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(COLOR_MAP).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
              <span>{key}</span>
            </div>
          ))}
        </div>
      </div>

      <ChartContainer config={chartConfig} className="w-full h-[30vh]">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 60 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="faixa" width={90} tickLine={false} axisLine={false} />
            <ChartTooltip content={<CustomTooltip />} />
            <Bar dataKey="quantidade" radius={4} fill="#f59e0b">
              {data.map((entry, index) => (
                <Cell key={index} fill={COLOR_MAP[entry.faixa] || "#f59e0b"} />
              ))}
              <LabelList dataKey="quantidade" position="right" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}