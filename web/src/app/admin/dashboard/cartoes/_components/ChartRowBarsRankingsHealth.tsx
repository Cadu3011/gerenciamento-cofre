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
  percentual: {
    label: "Percentual",
    color: "#2563eb",
  },
} satisfies ChartConfig;

interface Props {
  data: {
    resumo: {
      totalGrupos: number;
      totalConciliados: number;
      totalDivergentes: number;

      percentualConciliado: number;
      percentualDivergente: number;

      percentualAutomaticoGeral: number;
      percentualManualGeral: number;
      percentualUnicoGeral: number;
    };

    ranking: {
      tipo: string;
      quantidade: number;
      percentual: number;
    }[];
  };
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;

  return (
    <div className="rounded-md border bg-white p-3 shadow-md">
      <p className="font-semibold">{item.tipo}</p>

      <p>
        Percentual: <strong>{item.percentual}%</strong>
      </p>

      <p>
        Quantidade: <strong>{item.quantidade}</strong>
      </p>
    </div>
  );
}

const getColor = (tipo: string) => {
  switch (tipo) {
    case "Automático":
      return "#22c55e";

    case "Manual ± R$2":
      return "#84cc16";

    case "Manual > R$2":
      return "#eab308";

    case "Único":
      return "#ef4444";

    default:
      return "#64748b";
  }
};

export default function ChartRowBarsRankingsHealth({ data }: Props) {
  const chartData = [...data.ranking].sort(
    (a, b) => b.percentual - a.percentual,
  );

  return (
    <div className="flex w-full flex-col gap-4 ">
      <div>
        <p className="text-lg font-semibold">Saúde da Conciliação</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Conciliados</p>
          <p className="text-2xl font-bold text-green-600">
            {data.resumo.percentualConciliado}%
          </p>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Divergentes</p>
          <p className="text-2xl font-bold text-red-600">
            {data.resumo.percentualDivergente}%
          </p>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Automático</p>
          <p className="text-2xl font-bold text-green-600">
            {data.resumo.percentualAutomaticoGeral}%
          </p>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Manual</p>
          <p className="text-2xl font-bold text-yellow-600">
            {data.resumo.percentualManualGeral}%
          </p>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Único</p>
          <p className="text-2xl font-bold text-red-600">
            {data.resumo.percentualUnicoGeral}%
          </p>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Total Grupos</p>
          <p className="text-2xl font-bold">
            {data.resumo.totalGrupos.toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#22c55e]" />
          <span>Automático</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#84cc16]" />
          <span>Manual ± R$2</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#eab308]" />
          <span>Manual &gt; R$2</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#ef4444]" />
          <span>Único</span>
        </div>
      </div>

      {/* Gráfico */}
      <ChartContainer config={chartConfig} className="w-full h-[50vh]">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              left: 20,
              right: 60,
            }}
          >
            <CartesianGrid horizontal={false} />

            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />

            <YAxis
              type="category"
              dataKey="tipo"
              width={140}
              tickLine={false}
              axisLine={false}
            />

            <ChartTooltip content={<CustomTooltip />} />

            <Bar dataKey="percentual" radius={4}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={getColor(entry.tipo)} />
              ))}

              <LabelList
                dataKey="percentual"
                position="right"
                formatter={(value: number) => `${value.toFixed(2)}%`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
