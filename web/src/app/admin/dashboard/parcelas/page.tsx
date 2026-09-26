import { getFiliais } from "@/app/api/post";
import { getFatoParcDashboard, getFatoParcFiltros } from "@/app/api/fato-parc";
import {
  formatDate,
  getDefaultStartDate,
  getDefaultEndDate,
  getAnoStart,
} from "../utils";
import CardTotals from "../_components/CardTotals";
import CardKPI from "../_components/CardKPI";
import ChartLineParcelas from "./_components/ChartLineParcelas";
import ChartColumnsParcDifsMensal from "./_components/ChartColumnsParcDifsMensal";
import ChartRowBarsRankings from "./_components/ChartRowBarsRankings";
import ChartHealthDivergencias from "./_components/ChartHealthDivergencias";
import ChartAgingPendencias from "./_components/ChartAgingPendencias";
import FilterBandeiraOrigem from "../cartoes/_components/FilterBandeiraOrigem";

type Props = {
  searchParams: {
    startDate?: string;
    endDate?: string;
    filialId?: string;
    adquirente?: string;
    bandeiras?: string;
    bandeirasModo?: string;
  };
};

export default async function DashboardParcelas({ searchParams }: Props) {
  const [filiais, filtros] = await Promise.all([
    getFiliais(),
    getFatoParcFiltros(),
  ]);

  const {
    startDate = getDefaultStartDate(),
    endDate = getDefaultEndDate(),
    filialId,
    adquirente,
    bandeiras,
    bandeirasModo,
  } = await searchParams;

  const params = {
    startDate,
    endDate,
    ...(filialId && { filialId }),
    ...(adquirente && { adquirente }),
    ...(bandeiras && { bandeiras }),
    ...(bandeirasModo && { bandeirasModo }),
  };
  const query = new URLSearchParams(params).toString();
  const anoQuery = new URLSearchParams({ ...params, startDate: getAnoStart() }).toString();

  const [data, dataAnual] = await Promise.all([
    getFatoParcDashboard(query),
    getFatoParcDashboard(anoQuery),
  ]);

  if (!data)
    return (
      <div className="p-8 text-red-500">
        Erro ao carregar dashboard de parcelas
      </div>
    );

  const { cardsTotals, chartLines, rankings, chartRankingDivergencias, aging } = data;
  const chartDiferencaMensal = dataAnual?.chartDiferencaMensal ?? [];

  const somaAutomaticos = rankings.reduce((s: number, r: any) => s + (r.automaticos ?? 0), 0);
  const somaGruposRanking = rankings.reduce((s: number, r: any) => s + (r.totalGrupos ?? 0), 0);
  const taxaAutomGeral =
    somaGruposRanking > 0
      ? ((somaAutomaticos / somaGruposRanking) * 100).toFixed(1)
      : "0";

  return (
    <div className="flex gap-2">
      <div className="flex flex-col w-full">
        <div className="py-3 w-full flex flex-col gap-5">
          <div className="w-full px-8 flex gap-3">
            <CardTotals
              title="Total Trier"
              value={cardsTotals.erp}
              backgroundColor="bg-blue-200"
              fontSize="text-3xl"
              fontBold
            />
            <CardTotals
              title="Total Adquirentes"
              value={cardsTotals.adquirentes}
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

            <div className="text-2xl p-2 rounded-md flex flex-col w-full bg-blue-950">
              <p className="text-center w-full text-white">
                Parcelas Trier vs Adquirentes
              </p>
              <div className="bg-white flex flex-col w-full">
                <p className="text-center">
                  {filiais.find((f: any) => f.id === Number(filialId))?.name ||
                    "todos"}
                </p>
                <p className="text-center">
                  {formatDate(startDate)} até {formatDate(endDate)}
                </p>
              </div>
            </div>

            <CardKPI
              title="Materialidade"
              value={`${cardsTotals.materialidade}%`}
              sub="R$ divergente ÷ total Trier"
              backgroundColor="bg-yellow-100"
              emphasis={cardsTotals.materialidade >= 5}
            />
            <CardKPI
              title="Conc. Automática"
              value={`${taxaAutomGeral}%`}
              sub="grupos não-manuais"
              backgroundColor="bg-indigo-100"
            />
          </div>
          <div className="w-full px-10">
            <FilterBandeiraOrigem filtros={filtros as Record<string, string[]>} />
          </div>
          <div className="w-full px-10 gap-5 flex justify-between">
            <ChartLineParcelas data={chartLines} />
            <ChartColumnsParcDifsMensal data={chartDiferencaMensal} />
          </div>
          <div className="w-full flex flex-col px-10 gap-10">
            <ChartRowBarsRankings data={rankings} />
            <ChartHealthDivergencias data={chartRankingDivergencias} />
            <ChartAgingPendencias data={aging} />
          </div>
        </div>
      </div>
    </div>
  );
}