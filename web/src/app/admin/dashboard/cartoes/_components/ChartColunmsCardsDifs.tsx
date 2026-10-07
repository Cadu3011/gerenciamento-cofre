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
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

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
  /**
   * Granularidade com que a API agrupou as barras. Só `dia` é navegável: uma
   * barra de semana ou de mês não corresponde a um dia, e a página de
   * conciliação só abre por dia.
   */
  granularidade: "dia" | "semana" | "mes";
}

export default function ChartColumnsCardsDifs({ data, granularidade }: Props) {
  const searchParams = useSearchParams();

  const values = data.flatMap((item) => [item.diferenca]);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const range = max - min;
  const padding = range === 0 ? Math.abs(max) * 0.2 || 100 : range * 0.1;

  const yMin = min < 0 ? min - padding : 0;
  const yMax = max > 0 ? max + padding : 0;

  const getBarColor = (diferenca: number) => {
    return diferenca >= -100 && diferenca <= 100
      ? "#22c55e" // green-500
      : diferenca > 100
        ? "#ca8a04" // yellow-600
        : "#ef4444"; // red-500
  };

  const navegavel = granularidade === "dia";

  /** Abre o detalhe em outra aba, para o dashboard continuar à mão. */
  function abrirDetalhe(dia: string) {
    if (!navegavel) return;

    const filialId = searchParams.get("filialId");
    // A conciliação é por filial: sem ela a barra é a soma de todas e não há
    // detalhe correspondente.
    if (!filialId) {
      toast.info("Selecione uma filial para detalhar o dia.");
      return;
    }

    const aba = window.open(
      `/admin/concilia-cartao/details/${dia}/${filialId}`,
      "_blank",
      "noopener,noreferrer",
    );

    if (!aba) {
      toast.warn("O navegador bloqueou a nova aba. Libere pop-ups aqui.");
    }
  }

  return (
    <div className="h-full w-1/2 flex flex-col">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <p className="font-bold">Vendas Trier vs Adquirentes por dia</p>

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
      {!navegavel && (
        <p className="text-xs text-muted-foreground">
          {granularidade === "semana"
            ? "Visão por semana: para clicar e abrir a conciliação do dia, use um período de até 31 dias."
            : "Visão por mês: para clicar e abrir a conciliação do dia, use um período de até 31 dias."}
        </p>
      )}
      <ChartContainer config={chartConfig} className="h-full w-full">
        <BarChart
          accessibilityLayer
          data={data}
          onClick={(state) => {
            const item = state?.activePayload?.[0]?.payload as
              { data: string } | undefined;
            if (item?.data) abrirDetalhe(item.data);
          }}
        >
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
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={(value) =>
              Intl.NumberFormat("pt-BR", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(value)
            }
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="diferenca"
            radius={4}
            cursor={navegavel ? "pointer" : "auto"}
          >
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
