"use client";

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
  data: { data: string; trier: number; adquirentes: number }[];
}

const chartConfig = {
  trier: { label: "Trier", color: "#529DFB" },
  adquirentes: { label: "Adquirentes", color: "#F9A84A" },
} satisfies ChartConfig;

export default function ChartLineAReceber({ data }: Props) {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <p className="font-bold">A Receber por Vencimento</p>
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
        <LineChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="data"
            tickFormatter={(value) => { const [ano, mes, dia] = value.split("-"); return `${dia}/${mes}`; }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line dataKey="trier" stroke="#529DFB" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 7 }} />
          <Line dataKey="adquirentes" type="monotone" stroke="#F9A84A" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
