"use client";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  valor: { label: "Valor", color: "#2563eb" },
} satisfies ChartConfig;

interface Props {
  data: {
    filial: string;
    filialId: number;
    diferenca: number;
    divergencias: number;
  }[];
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border bg-white p-3 text-black shadow-md">
      <p className="font-semibold">{item.filial}</p>
      <p>
        Trier:{" "}
        {item.trier.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </p>
      <p>
        Adquirentes:{" "}
        {item.adquirentes.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </p>
      <p>
        Diferença:{" "}
        {item.diferenca.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </p>
      <p>Divergências: {item.divergencias}</p>
    </div>
  );
}

export default function ChartRowBarsRankings({ data }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const chartData = [...data]
    .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca))
    .map((item) => ({ ...item, valorAbs: Math.abs(item.diferenca) }));

  const maxAbs = Math.max(...chartData.map((d) => d.valorAbs), 1);
  const threshold = maxAbs * 0.05;

  const getBarColor = (diferenca: number) =>
    diferenca >= -threshold && diferenca <= threshold
      ? "#22c55e"
      : diferenca < -threshold
        ? "#ef4444"
        : "#ca8a04";

  const handleClick = (data: any) => {
    if (!data?.filial) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("filialId", String(data.filialId));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex h-[50vh] w-full flex-col">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <p className="font-medium">Ranking de Divergências</p>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#22c55e]" />
              <span>Moderado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#ef4444]" />
              <span>Falta (Trier &lt; Adq)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#ca8a04]" />
              <span>Sobra (Trier &gt; Adq)</span>
            </div>
          </div>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="h-full w-full">
        <ResponsiveContainer width="100%" height={450}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 20, right: 60 }}
          >
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(value) =>
                value.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                })
              }
            />
            <YAxis
              type="category"
              dataKey="filial"
              width={110}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<CustomTooltip />} />
            <Bar
              dataKey="valorAbs"
              radius={4}
              onClick={(data) => handleClick(data)}
              cursor="pointer"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={getBarColor(entry.diferenca)} />
              ))}
              <LabelList
                dataKey="diferenca"
                position="right"
                fill="#000"
                formatter={(value: number) =>
                  value.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })
                }
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
