"use client";

import { useState } from "react";

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { LineChart, Line, XAxis, CartesianGrid } from "recharts";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Props {
  chartLinesCards: {
    data: string;
    trier: number;
    adquirentes: number;
  }[];
}

const chartConfig = {
  trier: {
    label: "Trier",
    color: "#dc2626",
  },

  adquirentes: {
    label: "Adquirentes",
    color: "#2563eb",
  },
} satisfies ChartConfig;

export default function ChartLineCards({ chartLinesCards }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <p className="font-bold">Vendas Trier vs Adquirentes</p>

          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#529DFB]" />
              <span>Trier</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#F9A84A]" />
              <span>Adquirentes</span>
            </div>
          </div>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="h-full w-full">
        <LineChart data={chartLinesCards}>
          <CartesianGrid vertical={false} />

          <XAxis
            dataKey="data"
            tickFormatter={(value) => {
              const [ano, mes, dia] = value.split("-");
              return `${dia}/${mes}`;
            }}
          />

          <ChartTooltip content={<ChartTooltipContent />} />

          <Line
            dataKey="trier"
            stroke="#529DFB"
            strokeWidth={4}
            dot={{ r: 4 }}
            activeDot={{ r: 7 }}
          />

          <Line
            dataKey="adquirentes"
            type={"monotone"}
            stroke="#F9A84A"
            strokeWidth={3}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
