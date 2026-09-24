import { getFiliais } from "@/app/api/post";
import { getParcDashboard, getParcBandeiras } from "@/app/api/conciliacao-parc";
import {
  formatDate,
  BANDEIRAS_PADRAO,
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
import FilterBandeira from "../_components/FilterBandeira";

type Props = {
  searchParams: {
    startDate?: string;
    endDate?: string;
    filialId?: string;
    bandeiras?: string;
  };
};

export default async function DashboardParcelas({ searchParams }: Props) {
  const [filiais, bandeirasList] = await Promise.all([
    getFiliais(),
    getParcBandeiras(),
  ]);

  const {
    startDate = getDefaultStartDate(),
    endDate = getDefaultEndDate(),
    filialId,
    bandeiras,
  } = await searchParams;

  const bandeirasExcluidas = bandeiras ?? BANDEIRAS_PADRAO.join(",");

  const params = { startDate, endDate, ...(filialId && { filialId }), bandeiras: bandeirasExcluidas };
  const query = new URLSearchParams(params).toString();
  const anoQuery = new URLSearchParams({ ...params, startDate: getAnoStart() }).toString();

  const [data, dataAnual] = await Promise.all([
    getParcDashboard(query),
    getParcDashboard(anoQuery),
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
              value={String(Number(cardsTotals.diferenca) * -1)}
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
            <FilterBandeira
              bandeiras={bandeirasList}
              defaultExcluded={BANDEIRAS_PADRAO}
            />
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