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
} from "recharts";
import { calculateDynamicMax } from "../utils";
import { useRouter, useSearchParams } from "next/navigation";

const chartConfig = {
  falta: {
    label: "Total falta",
    color: "#dc2626",
  },
  sobra: {
    label: "Total sobra",
    color: "#2563eb",
  },
} satisfies ChartConfig;

export interface Props {
  data: {
    idOperador: string;
    operador: string;
    falta: number;
    sobra: number;
  }[];
}

export default function ChartColumnsDifs({ data }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const values = data.flatMap((item) => [item.falta, item.sobra]);
  const yAxisMax = calculateDynamicMax(values, 0.15);

  const setIdOperatorOnUrl = (operadorId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = searchParams.get("operadorId");
    if (String(operadorId) === current) {
      params.delete("operadorId");
    } else {
      params.set("operadorId", operadorId);
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  };
  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <BarChart
        accessibilityLayer
        data={data}
        onClick={(state) => {
          if (!state || !state.activePayload?.length) return;

          const item = state.activePayload[0].payload;

          if (item?.idOperador) {
            setIdOperatorOnUrl(item.idOperador);
          }
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="operador"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tick={{ fill: "#000" }}
          tickFormatter={(value) => value.slice(0, 10)}
        />

        <YAxis domain={[0, yAxisMax]} tickCount={6} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="falta" stroke="#dc2626" fill="#dc2626" radius={4}>
          <LabelList dataKey="falta" position="top" fill="#000" />
        </Bar>
        <Bar dataKey="sobra" stroke="#2563eb" fill="#2563eb" radius={4}>
          <LabelList dataKey="sobra" position="top" fill="#000" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
