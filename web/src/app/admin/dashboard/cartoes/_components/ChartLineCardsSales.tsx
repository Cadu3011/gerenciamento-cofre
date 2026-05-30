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
  const parsedData = chartLinesCards;
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex justify-between">
        <div>
          <p>Totais Trier vs Adquirentes</p>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-full w-full">
        <LineChart data={parsedData}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="data"
            tickFormatter={(value) => {
              const [ano, mes, dia] = value.split("-");
              return `${dia}/${mes}`;
            }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            key={"Trier"}
            type="monotone"
            dataKey="trier"
            stroke="#529DFB"
            strokeWidth={4}
            dot={{ r: 4 }}
            activeDot={{ r: 7 }}
          />
          <Line
            key="Adquirentes"
            type="monotone"
            dataKey="adquirentes"
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
