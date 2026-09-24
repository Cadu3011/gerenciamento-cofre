import { getCardsTotalCards } from "@/app/api/post";
import { getFatoCardsDashboard, getFatoCardsFiltros } from "@/app/api/fato-cartao";
import CardTotals from "../../_components/CardTotals";
import { formatDate } from "../../utils";
import ChartLineCards from "./ChartLineCardsSales";
import ChartColumnsCardsDifs from "./ChartColunmsCardsDifs";
import ChartRowBarsRankingsHealth from "./ChartRowBarsRankingsHealth";
import DialogHealthWrapper from "./DialogHealthWrapper";
import FilterBandeiraOrigem from "./FilterBandeiraOrigem";

export async function KpiRowSection({
  startDate,
  endDate,
  fatoQuery,
}: {
  startDate: string;
  endDate: string;
  fatoQuery: string;
}) {
  const fatoData = await getFatoCardsDashboard(fatoQuery);

  const { cardsTotals = { erp: 0, adquirentes: 0, diferenca: 0, naoConciliados: 0 } } =
    fatoData ?? {};

  return (
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
        title="Total Diferença"
        value={String(cardsTotals.diferenca * -1)}
        backgroundColor="bg-green-200"
        fontSize="text-3xl"
        fontBold
      />
      <CardTotals
        title="Divergências não Conciliadas"
        value={String(cardsTotals.naoConciliados * -1)}
        backgroundColor="bg-zinc-100"
        fontSize="text-3xl"
        alertValue={true}
        fontBold
      />
      <div className="text-2xl p-2 rounded-md flex flex-col w-full bg-blue-950">
        <p className="text-center w-full text-white">
          Cartões Trier vs Adquirentes
        </p>
        <div className="bg-white flex flex-col w-full">
          <p className="text-center ">
            {formatDate(startDate)} até <br />
            {formatDate(endDate)}
          </p>
        </div>
      </div>
    </div>
  );
}

export async function FilterSection() {
  const filtros = await getFatoCardsFiltros();
  return (
    <div className="w-full px-10">
      <FilterBandeiraOrigem filtros={filtros} />
    </div>
  );
}

export async function ChartsRowSection({ fatoQuery }: { fatoQuery: string }) {
  const fatoData = await getFatoCardsDashboard(fatoQuery);
  const { chartLinesCards = [] } = fatoData ?? {};

  return (
    <div className="w-full px-10 gap-5 flex justify-between">
      <ChartLineCards chartLinesCards={chartLinesCards} />
      <ChartColumnsCardsDifs data={chartLinesCards} />
    </div>
  );
}

export async function HealthSection({ saudeQuery }: { saudeQuery: string }) {
  const saudeData = await getCardsTotalCards(saudeQuery);
  const {
    chartRankingHealth = {
      resumo: {
        totalGrupos: 0,
        totalConciliados: 0,
        totalDivergentes: 0,
        percentualConciliado: 0,
        percentualDivergente: 0,
        percentualAutomaticoGeral: 0,
        percentualManualGeral: 0,
        percentualUnicoGeral: 0,
      },
      ranking: [],
    },
  } = saudeData ?? {};

  return <ChartRowBarsRankingsHealth data={chartRankingHealth} />;
}

export async function HealthDialogSection({
  saudeQuery,
  type,
}: {
  saudeQuery: string;
  type?: string;
}) {
  const saudeData = await getCardsTotalCards(saudeQuery);
  const { movesRankingByHealth = [] } = saudeData ?? {};
  return <DialogHealthWrapper type={type} data={movesRankingByHealth} />;
}