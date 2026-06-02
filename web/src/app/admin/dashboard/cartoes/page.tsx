import { getCardsTotalCards, getFiliais } from "@/app/api/post";
import CardTotals from "../_components/CardTotals";
import { formatDate } from "../utils";
import ChartLineCards from "./_components/ChartLineCardsSales";
import ChartColumnsCardsDifs from "./_components/ChartColunmsCardsDifs";
import ChartRowBarsRankings from "./_components/ChartRowBarsRankings";

type Props = {
  searchParams: {
    startDate?: string;
    endDate?: string;
    filialId?: string;
    // operadorId?: string;
    // periodo?: string;
  };
};

export default async function Dashboard({ searchParams }: Props) {
  function getDefaultStartDate() {
    const today = new Date();

    const referenceDate =
      today.getDate() <= 5
        ? new Date(today.getFullYear(), today.getMonth() - 1, 1)
        : new Date(today.getFullYear(), today.getMonth(), 1);

    return referenceDate.toISOString().split("T")[0];
  }

  function getDefaultEndDate() {
    const today = new Date();

    const referenceDate =
      today.getDate() <= 5
        ? new Date(today.getFullYear(), today.getMonth(), 0) // último dia do mês anterior
        : today;

    return referenceDate.toISOString().split("T")[0];
  }

  const filiais = await getFiliais();

  const {
    startDate = getDefaultStartDate(),
    endDate = getDefaultEndDate(),
    filialId,
  } = await searchParams;

  const query = new URLSearchParams({
    startDate,
    endDate,
    ...(filialId && { filialId }),
  }).toString();

  const data = await getCardsTotalCards(query);

  const { cardsTotals, chartLinesCards, rankings } = data;

  return (
    <div className="flex gap-2">
      <div className="flex flex-col w-full">
        <div className="">
          <div className="py-3 w-full flex flex-col gap-5">
            <div className="">
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
                <div className="text-2xl p-2  rounded-md flex flex-col w-full bg-blue-950">
                  <p className="text-center w-full text-white">
                    Cartões Trier vs Adquirentes
                  </p>
                  <div className="bg-white  flex flex-col w-full">
                    <p className="text-center">
                      {filiais.find((f: any) => f.id === Number(filialId))
                        ?.name || "todos"}
                    </p>
                    <p className="text-center ">
                      {formatDate(startDate)} até <br />
                      {formatDate(endDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full px-10 gap-5 flex justify-between">
              <ChartLineCards chartLinesCards={chartLinesCards} />
              <ChartColumnsCardsDifs data={chartLinesCards} />
            </div>
            <div className="w-full px-10 gap-5 ">
              <ChartRowBarsRankings data={rankings} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
