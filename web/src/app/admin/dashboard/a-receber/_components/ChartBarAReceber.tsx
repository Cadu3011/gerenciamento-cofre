"use client";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatNum } from "../../utils";

/**
 * Barras duplas por dia: o que venceu na data vs o que efetivamente caiu.
 *
 * Os dois números vêm de `Receivable` — `valorEsperado` e `valorRecebido` —
 * então a distância entre as barras é justamente o que ainda não foi baixado
 * no ERP naquele dia.
 */
const chartConfig = {
  vencimento: { label: "Vencimento", color: "#529DFB" },
  recebimento: { label: "Recebimento", color: "#F9A84A" },
} satisfies ChartConfig;

interface Linha {
  data: string;
  vencimento: number;
  recebimento: number;
  semBaixa: number;
  conciliados: number;
  divergentes: number;
}

interface Props {
  data: Linha[];
}

/**
 * `DATE()` volta como `2026-10-06`, mas dependendo do driver pode virar
 * `2026-10-06T00:00:00.000Z` depois do `JSON.stringify` — corta nos 10
 * primeiros caracteres para os dois casos darem `06/10`.
 */
function formatDia(valor: unknown) {
  const texto = String(valor ?? "");
  const [ano, mes, dia] = texto.slice(0, 10).split("-");
  if (!dia || !mes) return texto;
  return `${dia}/${mes}`;
}

/**
 * Tooltip próprio: o `ChartTooltipContent` não expõe rodapé, e as três
 * contagens de status não cabem em `formatter` sem virar ruído.
 */
function TooltipRecebimentos({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const linha: Linha = payload[0].payload;
  const saldo = Number(linha.vencimento) - Number(linha.recebimento);

  return (
    <div className="rounded-md border bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{formatDia(linha.data)}</p>

      <div className="flex items-center justify-between gap-6">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#529DFB]" />
          Vencimento
        </span>
        <span className="font-medium">{formatNum(linha.vencimento)}</span>
      </div>

      <div className="flex items-center justify-between gap-6">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#F9A84A]" />
          Recebimento
        </span>
        <span className="font-medium">{formatNum(linha.recebimento)}</span>
      </div>

      <div className="mt-1 flex items-center justify-between gap-6 border-t pt-1">
        <span>Saldo do dia</span>
        <span className="font-medium">{formatNum(saldo)}</span>
      </div>

      <div className="mt-1 flex items-center justify-between gap-6 text-muted-foreground">
        <span>Aguardando baixa</span>
        <span>{linha.semBaixa}</span>
      </div>

      <div className="flex items-center justify-between gap-6 text-muted-foreground">
        <span>Conciliados / Divergentes</span>
        <span>
          {linha.conciliados} / {linha.divergentes}
        </span>
      </div>
    </div>
  );
}

export default function ChartBarAReceber({ data }: Props) {
  if (!data.length) {
    return (
      <div className="w-full border rounded-md bg-white p-6 text-sm text-muted-foreground">
        Nenhum recebimento lançado no período.
        <span className="block mt-1 text-xs">
          O gráfico passa a aparecer depois que a tarefa <b>Receivables</b>{" "}
          gerar os recebíveis do intervalo.
        </span>
      </div>
    );
  }

  return (
    <div className="w-full border rounded-md bg-white p-4 h-56">
      <div className="mb-2 flex items-center gap-6">
        <p className="font-bold">Vencimentos vs Recebimentos</p>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#529DFB]" />
            <span>Vencimento</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#F9A84A]" />
            <span>Recebimento</span>
          </div>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-full w-full">
        <BarChart data={data} margin={{ top: 8, left: 0, right: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="data"
            tickFormatter={formatDia}
            interval="preserveStartEnd"
            minTickGap={24}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatNum(v)}
            tickLine={false}
            axisLine={false}
            width={90}
          />
          <ChartTooltip content={<TooltipRecebimentos />} />
          <Bar dataKey="vencimento" fill="#529DFB" radius={[3, 3, 0, 0]} />
          <Bar dataKey="recebimento" fill="#F9A84A" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
