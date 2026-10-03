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
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

const chartConfig = {
  diferenca: { label: "Diferença", color: "#dc2626" },
} satisfies ChartConfig;

/**
 * Situação do dashboard → situação da página de detalhe.
 *
 * O rótulo "Pendente" do dashboard não existe como status de grupo. O ETL
 * grava `PENDENTE` na parcela que nunca entrou na conciliação, e o `aplicarStatus`
 * do Fato joga esse valor no balde `valorPendente` junto com `NAO_ENCONTRADO`
 * (o `default` do switch). Já `ConciliacaoParcela.status` — que é o que o
 * detalhe filtra — só tem `CONCILIADO`, `DIVERGENTE` e `NAO_ENCONTRADO`: no
 * banco não existe nenhum grupo com status `PENDENTE`.
 *
 * Então "sem match", que é o que o usuário quer ver ao pedir pendente, é
 * `NAO_ENCONTRADO` no detalhe. Ver `STATUSES` em `Filtros.tsx`, que traz
 * exatamente esses três valores.
 */
const STATUS_NO_DETALHE: Record<string, string> = {
  PENDENTE: "NAO_ENCONTRADO",
  DIVERGENTE: "DIVERGENTE",
  CONCILIADO: "CONCILIADO",
};

function paraStatusDoDetalhe(status: string) {
  return status
    .split(",")
    .filter(Boolean)
    .map((s) => STATUS_NO_DETALHE[s] ?? s)
    .join(",");
}

interface Props {
  data: { data: string; diferenca: number }[];
}

export default function ChartColumnsParcDifs({ data }: Props) {
  const searchParams = useSearchParams();

  const values = data.flatMap((item) => [item.diferenca]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const yMin = min < 0 ? min * 1.1 : 0;
  const yMax = max > 0 ? max * 1.1 : 0;

  const maxAbs = Math.max(Math.abs(min), Math.abs(max), 1);
  const threshold = maxAbs * 0.05;

  const getBarColor = (diferenca: number) =>
    diferenca >= -threshold && diferenca <= threshold
      ? "#22c55e"
      : diferenca > threshold
        ? "#ca8a04"
        : "#ef4444";

  /** Abre o detalhe em outra aba, para o dashboard continuar à mão. */
  function abrirDetalhe(dia: string) {
    const filialId = searchParams.get("filialId");
    // A conciliação é por filial: sem ela a barra é a soma de todas e não há
    // detalhe correspondente.
    if (!filialId) {
      toast.info("Selecione uma filial para detalhar o dia.");
      return;
    }

    // Situação e bandeiras vão junto: a página de detalhe sabe filtrar por
    // elas, e o usuário desceu até aqui justamente olhando esse recorte.
    // `bandeiras` só no modo inclusão — o detalhe não tem "modo", ele sempre
    // faz `bandeira IN (...)`. Repassar a lista de um dashboard em modo
    // excluir mostraria justamente as bandeiras que o usuário tinha tirado.
    const params = new URLSearchParams();
    const situacao = searchParams.get("status");
    if (situacao) {
      params.set("status", paraStatusDoDetalhe(situacao));
    }
    if (searchParams.get("bandeirasModo") !== "excluir") {
      const bandeiras = searchParams.get("bandeiras");
      if (bandeiras) params.set("bandeiras", bandeiras);
    }

    const query = params.toString();

    const aba = window.open(
      `/admin/concilia-parc/details/${dia}/${filialId}${query ? `?${query}` : ""}`,
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
          <p className="font-bold">Diferença Diária (Adquirentes − Trier)</p>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#22c55e]" />
              <span>Moderado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#ef4444]" />
              <span>Falta (Trier &lt; Adq)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#ca8a04]" />
              <span>Sobra (Trier &gt; Adq)</span>
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
            tickFormatter={(value) => {
              const [ano, mes, dia] = value.split("-");
              return `${dia}/${mes}`;
            }}
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
                if (!value || Number(value) === 0) return null;
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
