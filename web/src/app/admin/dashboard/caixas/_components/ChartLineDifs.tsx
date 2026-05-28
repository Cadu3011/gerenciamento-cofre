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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FilterPeriodo from "./FilterPeriodo";

interface Props {
  data: {
    periodo: string;
    total_falta: number;
    total_sobra: number;
    total_geral: number;
  }[];
}

const chartConfig = {
  total_falta: {
    label: "Total falta",
    color: "#dc2626",
  },

  total_sobra: {
    label: "Total sobra",
    color: "#2563eb",
  },

  total_geral: {
    label: "Total geral",
    color: "#16a34a",
  },
} satisfies ChartConfig;

export default function ChartLineDifs({ data }: Props) {
  const [modo, setModo] = useState<"DETALHADO" | "TOTAL">("DETALHADO");

  const parsedData = data.map((item) => ({
    ...item,
    total_falta: Number(item.total_falta),
    total_sobra: Number(item.total_sobra),
    total_geral: Number(item.total_geral),
  }));

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex justify-between">
        <div>
          <p>TOTAIS FALTAS E SOBRAS ANUAL</p>
        </div>
        <div>
          <Select
            value={modo}
            onValueChange={(value: "DETALHADO" | "TOTAL") => setModo(value)}
          >
            <SelectTrigger className="w-56  bg-zinc-900 border-none text-white h-2/3">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="DETALHADO">Detalhado</SelectItem>

              <SelectItem value="TOTAL">Apenas Totais</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FilterPeriodo />
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-full w-full">
        <LineChart data={parsedData}>
          <CartesianGrid vertical={false} />

          <XAxis
            tickFormatter={(value) => value.slice(0, 10)}
            dataKey="periodo"
            tickMargin={10}
            tick={({ x, y, payload }) => {
              const [inicio, fim] = payload.value.split(" a ");

              const format = (date: string) => {
                const [ano, mes, dia] = date.split("-");
                return `${dia}/${mes}/${ano}`;
              };

              return (
                <text x={x} y={y} textAnchor="middle" fontSize={12}>
                  <tspan x={x} dy="0">
                    {format(inicio)} a
                  </tspan>

                  <tspan x={x} dy="14">
                    {format(fim)}
                  </tspan>
                </text>
              );
            }}
          />

          <ChartTooltip content={<ChartTooltipContent />} />

          <ChartLegend content={<ChartLegendContent />} />

          {modo === "TOTAL" ? (
            <Line
              type="monotone"
              dataKey="total_geral"
              stroke="#16a34a"
              strokeWidth={4}
              dot={{ r: 4 }}
              activeDot={{ r: 7 }}
            />
          ) : (
            [
              <Line
                key="falta"
                type="monotone"
                dataKey="total_falta"
                stroke="#dc2626"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />,

              <Line
                key="sobra"
                type="monotone"
                dataKey="total_sobra"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />,
            ]
          )}
        </LineChart>
      </ChartContainer>
    </div>
  );
}
