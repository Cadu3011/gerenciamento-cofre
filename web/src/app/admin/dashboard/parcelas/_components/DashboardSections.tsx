import { getFiliais } from "@/app/api/post";
import {
  getFatoParcDashboard,
  getFatoParcDiferencaMensal,
} from "@/app/api/fato-parc";
import { formatDate } from "../../utils";
import CardTotals from "../../_components/CardTotals";
import CardKPI from "../../_components/CardKPI";
import ChartColumnsParcDifs from "./ChartColunmsParcDifs";
import ChartColumnsParcDifsMensal from "./ChartColumnsParcDifsMensal";
import ChartRowBarsRankings from "./ChartRowBarsRankings";
import ChartHealthDivergencias from "./ChartHealthDivergencias";

type DashboardData = {
  cardsTotals: {
    erp: number;
    adquirentes: number;
    diferenca: number;
    materialidade: number;
  };
  chartLines: any[];
  rankings: any[];
  chartRankingDivergencias: any;
};

export type DashboardFilterParams = {
  startDate: string;
  endDate: string;
  filialId?: string;
  /** Origens, lista separada por vírgula (`TRIER,REDE`). */
  adquirentes?: string;
  bandeiras?: string;
  bandeirasModo?: string;
  /** Situações, lista separada por vírgula (`PENDENTE,DIVERGENTE`). */
  status?: string;
};

export function buildQuery(params: DashboardFilterParams) {
  return new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  ).toString();
}

async function fetchDashboard(query: string): Promise<DashboardData | null> {
  return (await getFatoParcDashboard(query)) as DashboardData | null;
}

/**
 * Cards de total + KPIs. Ficam numa seção própria porque só dependem do
 * primeiro groupBy da API e pintam antes das agregações de conciliação.
 */
export async function CardsRowSection({
  query,
  filialId,
  startDate,
  endDate,
}: {
  query: string;
  filialId?: string;
  startDate: string;
  endDate: string;
}) {
  const data = await fetchDashboard(query);
  if (!data)
    return (
      <div className="w-full px-8 text-red-500">
        Erro ao carregar dashboard de parcelas
      </div>
    );

  const { cardsTotals } = data;

  // "Não conciliado" é só o que ficou sem match (bucket PENDENTE) —
  // divergente não entra, porque a venda foi casada com o registro do
  // adquirente e o que existe ali é uma observação, não parcela órfã. A API
  // devolve a proporção pronta em `materialidade`. A base é o bruto do período,
  // então trocar o filtro de situação não move o número.
  const taxaNaoConciliado = cardsTotals.materialidade ?? 0;

  const filiais = await getFiliais();
  const nomeFilial =
    filiais.find((f: any) => f.id === Number(filialId))?.name || "todos";

  return (
    <div className="w-full px-8 flex gap-3">
      <CardTotals
        title="Total Trier"
        value={String(cardsTotals.erp)}
        backgroundColor="bg-blue-200"
        fontSize="text-3xl"
        fontBold
      />
      <CardTotals
        title="Total Adquirentes"
        value={String(cardsTotals.adquirentes)}
        backgroundColor="bg-orange-200"
        fontSize="text-3xl"
        fontBold
      />
      <CardTotals
        title="Diferença"
        value={String(cardsTotals.diferenca)}
        backgroundColor="bg-green-200"
        fontSize="text-3xl"
        fontBold
      />
      <CardKPI
        title="Não conciliado"
        value={`${taxaNaoConciliado}%`}
        sub="R$ sem match ÷ total Trier"
        backgroundColor="bg-yellow-100"
        emphasis={taxaNaoConciliado >= 5}
      />
      <div className="text-2xl p-2 rounded-md flex flex-col w-full bg-blue-950">
        <p className="text-center w-full text-white">
          Parcelas Trier vs Adquirentes
        </p>
        <div className="bg-white flex flex-col w-full">
          <p className="text-center">{nomeFilial}</p>
          <p className="text-center">
            {formatDate(startDate)} até {formatDate(endDate)}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Gráfico diário (período selecionado) e mensal (ano corrente). */
export async function DiffChartsSection({
  query,
  anoQuery,
}: {
  query: string;
  anoQuery: string;
}) {
  const [data, dataAnual] = await Promise.all([
    fetchDashboard(query),
    getFatoParcDiferencaMensal(anoQuery),
  ]);

  return (
    <div className="w-full px-10 gap-5 flex justify-between">
      <ChartColumnsParcDifs data={data?.chartLines ?? []} />
      <ChartColumnsParcDifsMensal
        data={(dataAnual as any)?.chartDiferencaMensal ?? []}
      />
    </div>
  );
}

/** Ranking por filial. */
export async function RankingsSection({ query }: { query: string }) {
  const data = await fetchDashboard(query);
  return <ChartRowBarsRankings data={data?.rankings ?? []} />;
}

/** Saúde das divergências (resumo + ranking de observações). */
export async function ConcHealthSection({ query }: { query: string }) {
  const data = await fetchDashboard(query);
  return <ChartHealthDivergencias data={data?.chartRankingDivergencias} />;
}
