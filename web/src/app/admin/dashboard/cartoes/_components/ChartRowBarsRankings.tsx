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
  diferenca: {
    label: "Diferença",
    color: "#2563eb",
  },
} satisfies ChartConfig;

export interface Props {
  data: {
    filial: string;
    filialId: number;
    trier: number;
    adquirentes: number;
    diferenca: number;
    divergencias: number;
  }[];
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;

  return (
    <div className="rounded-md border bg-white p-3 text-black shadow-md">
      <p className="font-semibold">{item.filial}</p>
      <p>Trier: {BRL.format(item.trier)}</p>
      <p>Adquirentes: {BRL.format(item.adquirentes)}</p>
      <p>Diferença: {BRL.format(item.diferenca)}</p>
      <p>
        Divergências: <strong>{item.divergencias}</strong>
      </p>
    </div>
  );
}

export default function ChartRowBarsRankings({ data }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const chartData = [...data]
    .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca))
    .map((item) => ({
      ...item,
      valorAbs: Math.abs(item.diferenca),
    }));

  const getBarColor = (diferenca: number) => {
    return diferenca >= -100 && diferenca <= 100
      ? "#22c55e" // green-500 (Moderado)
      : diferenca > 100
        ? "#ca8a04" // yellow-600 (Sobra)
        : "#ef4444"; // red-500 (Falta)
  };

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
              <span>Falta</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#ca8a04]" />
              <span>Sobra</span>
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