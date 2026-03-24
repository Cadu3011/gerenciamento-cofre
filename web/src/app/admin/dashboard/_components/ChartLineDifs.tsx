"use client";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Props {
  data: { periodo: string; total_falta: number; total_sobra: number }[];
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
} satisfies ChartConfig;

export default function ChartLineDifs({ data }: Props) {
  const parsedData = data.map((item) => ({
    ...item,
    total_falta: Number(item.total_falta),
    total_sobra: Number(item.total_sobra),
  }));
  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <LineChart data={parsedData}>
        <CartesianGrid vertical={false} />
        <XAxis
          tickFormatter={(value) => value.slice(0, 10)}
          dataKey="periodo"
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

        <Line
          type="monotone"
          dataKey="total_falta"
          stroke="#dc2626"
          strokeWidth={3}
          dot={{ r: 3 }}
          activeDot={{ r: 6 }}
        />

        <Line
          type="monotone"
          dataKey="total_sobra"
          stroke="#2563eb"
          strokeWidth={3}
          dot={{ r: 3 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
