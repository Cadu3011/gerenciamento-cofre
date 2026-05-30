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
  CartesianGrid,
  XAxis,
  Bar,
  BarChart,
  LabelList,
  YAxis,
  ReferenceLine,
  Cell,
} from "recharts";
import { calculateDynamicMax } from "../../utils";

const chartConfig = {
  diferenca: {
    label: "Diferença",
    color: "#dc2626",
  },
} satisfies ChartConfig;

export interface Props {
  data: {
    data: string;
    diferenca: number;
  }[];
}

export default function ChartColumnsCardsDifs({ data }: Props) {
  const values = data.flatMap((item) => [item.diferenca]);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const yMin = min < 0 ? min * 1.15 : 0;
  const yMax = max > 0 ? max * 1.15 : 0;
  const getBarColor = (diferenca: number) => {
    return diferenca >= -100 && diferenca <= 100
      ? "#22c55e" // green-500
      : diferenca > 100
        ? "#ca8a04" // yellow-600
        : "#ef4444"; // red-500
  };
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex justify-between">
        <div>
          <p>Diferenças</p>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="h-full w-full">
        <BarChart accessibilityLayer data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="data"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tick={{ fill: "#000" }}
            tickFormatter={(value) => value.slice(0, 10)}
          />
          <ReferenceLine y={0} />
          <YAxis domain={[yMin, yMax]} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="diferenca" radius={4}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.diferenca)} />
            ))}

            <LabelList
              content={(props) => {
                const { x, y, value } = props;

                if (!value || Number(value) === 0) {
                  return null;
                }

                return (
                  <text
                    x={Number(x)}
                    y={Number(y) - 8}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#000"
                  >
                    {Number(value).toLocaleString("pt-BR", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
