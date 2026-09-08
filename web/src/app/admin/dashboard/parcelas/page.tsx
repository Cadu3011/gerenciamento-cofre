import { getFiliais } from "@/app/api/post";
import { getParcDashboard, getParcBandeiras } from "@/app/api/conciliacao-parc";
import { formatDate } from "../utils";
import CardTotals from "../_components/CardTotals";
import ChartLineParcelas from "./_components/ChartLineParcelas";
import ChartColumnsParcDifsMensal from "./_components/ChartColumnsParcDifsMensal";
import ChartRowBarsRankings from "./_components/ChartRowBarsRankings";
import ChartHealthDivergencias from "./_components/ChartHealthDivergencias";
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
  const BANDEIRAS_PADRAO = [
    "PAGAMENTO ONLINE IFOOD",
    "PIX SEGURO - PAGGPIX",
    "BRASILCARD 1X",
    "BRASILCARD 2X",
    "BRASILCARD 3X",
  ];
  function getDefaultStartDate() {
    const today = new Date();
    const referenceDate = today.getDate() <= 5
      ? new Date(today.getFullYear(), today.getMonth() - 1, 1)
      : new Date(today.getFullYear(), today.getMonth(), 1);
    return referenceDate.toISOString().split("T")[0];
  }

  function getDefaultEndDate() {
    const today = new Date();
    const referenceDate = today.getDate() <= 5
      ? new Date(today.getFullYear(), today.getMonth(), 0)
      : today;
    return referenceDate.toISOString().split("T")[0];
  }

  function getAnoStart() {
    const hoje = new Date();
    return new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1).toISOString().split("T")[0];
  }

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

  const { cardsTotals, chartLines, rankings, chartRankingDivergencias } = data;
  const chartDiferencaMensal = dataAnual?.chartDiferencaMensal ?? [];

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
          </div>
        </div>
      </div>
    </div>
  );
}
