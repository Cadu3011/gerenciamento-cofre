"use client";
import {
  ChartConfig,
  ChartContainer,
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
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { primeiroDiaDoMes, ultimoDiaDoMes } from "../../utils";

const chartConfig = {
  diferenca: {
    label: "Diferença",
    color: "#dc2626",
  },
} satisfies ChartConfig;

export interface Props {
  data: {
    mes: string;
    diferenca: number;
  }[];
}

function formatMes(mes: string) {
  const meses = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const [, m] = mes.split("-");
  return meses[parseInt(m, 10) - 1];
}

/**
 * Diferença mensal entre vendas Trier e adquirentes, na janela do ano
 * corrente. Substitui o antigo gráfico de linhas: os dois gráficos ficam com
 * a mesma métrica (divergência não conciliada, adquirentes menos Trier) e a
 * mesma regra de cor, mudando só a granularidade e o período.
 *
 * Clicar numa barra abre em outra aba o dashboard já filtrado no mês clicado.
 * Só as datas mudam — origem, bandeiras e situação continuam como estavam.
 */
export default function ChartColumnsCardsDifsMensal({ data }: Props) {
  const pathname = usePathname();
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

  function filtrarPeloMes(mes: string) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("startDate", primeiroDiaDoMes(mes));
    params.set("endDate", ultimoDiaDoMes(mes));

    const aba = window.open(
      `${pathname}?${params.toString()}`,
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
          <p className="font-bold">Vendas Trier vs Adquirentes por Mês</p>

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
        <BarChart
          accessibilityLayer
          data={data}
          onClick={(state) => {
            const item = state?.activePayload?.[0]?.payload as
              { mes: string } | undefined;
            if (item?.mes) filtrarPeloMes(item.mes);
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="mes"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tick={{ fill: "#000" }}
            tickFormatter={formatMes}
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
          <Bar dataKey="diferenca" radius={4} cursor="pointer">
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
