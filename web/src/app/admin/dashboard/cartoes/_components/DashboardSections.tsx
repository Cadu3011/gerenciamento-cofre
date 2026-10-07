import { getCardsTotalCards, getFiliais } from "@/app/api/post";
import {
  getFatoCardsDashboard,
  getFatoCardsDiferencaMensal,
  getFatoCardsFiltros,
} from "@/app/api/fato-cartao";
import CardTotals from "../../_components/CardTotals";
import { formatDate } from "../../utils";
import ChartColumnsCardsDifs from "./ChartColunmsCardsDifs";
import ChartColumnsCardsDifsMensal from "./ChartColumnsCardsDifsMensal";
import ChartRowBarsRankings from "./ChartRowBarsRankings";
import ChartRowBarsRankingsHealth from "./ChartRowBarsRankingsHealth";
import DialogHealthWrapper from "./DialogHealthWrapper";
import FilterBandeiraOrigem from "./FilterBandeiraOrigem";

export async function KpiRowSection({
  filialId,
  startDate,
  endDate,
  fatoQuery,
}: {
  filialId?: string;
  startDate: string;
  endDate: string;
  fatoQuery: string;
}) {
  const [filiais, fatoData] = await Promise.all([
    getFiliais(),
    getFatoCardsDashboard(fatoQuery),
  ]);

  const {
    cardsTotals = { erp: 0, adquirentes: 0, diferenca: 0, naoConciliados: 0 },
  } = fatoData ?? {};

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
          <p className="text-center">
            {filiais.find((f: any) => f.id === Number(filialId))?.name ||
              "todos"}
          </p>
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
      <FilterBandeiraOrigem
        filtros={filtros as Record<string, string[]>}
        bandeirasEmDialog
      />
    </div>
  );
}

/** Gráfico diário (período selecionado) e mensal (ano corrente). */
export async function ChartsRowSection({
  fatoQuery,
  anoQuery,
}: {
  fatoQuery: string;
  anoQuery: string;
}) {
  const [fatoData, fatoDataAnual] = await Promise.all([
    getFatoCardsDashboard(fatoQuery),
    getFatoCardsDiferencaMensal(anoQuery),
  ]);

  const { chartLinesCards = [], granularidade = "dia" } = fatoData ?? {};
  const { chartDiferencaMensal = [] } = (fatoDataAnual ?? {}) as {
    chartDiferencaMensal?: {
      mes: string;
      diferenca: number;
    }[];
  };

  return (
    <div className="w-full px-10 gap-5 flex justify-between">
      <ChartColumnsCardsDifs
        data={chartLinesCards}
        granularidade={granularidade}
      />
      <ChartColumnsCardsDifsMensal data={chartDiferencaMensal} />
    </div>
  );
}

export async function RankingsSection({ fatoQuery }: { fatoQuery: string }) {
  const fatoData = await getFatoCardsDashboard(fatoQuery);
  const { rankingDivergencias = [] } = fatoData ?? {};
  return <ChartRowBarsRankings data={rankingDivergencias} />;
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
