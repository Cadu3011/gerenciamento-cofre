import { getCardsCaixas } from "@/app/api/post";
import { FilterDateRange } from "./_components/FilterDateRange";
import FilterFilial from "./_components/FilterFilial";
import CardTotals from "./_components/CardTotals";
import ChartLineDifs from "./_components/ChartLineDifs";

type Props = {
  searchParams: {
    startDate?: string;
    endDate?: string;
    filialId?: string;
  };
};

function getDefaultStartDate() {
  const date = new Date();
  date.setDate(26);
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().split("T")[0]; // yyyy-mm-dd
}

function getDefaultEndDate() {
  const date = new Date();
  date.setDate(25);
  date.setMonth(date.getMonth());
  return date.toISOString().split("T")[0];
}

export default async function Dashboard({ searchParams }: Props) {
  const {
    startDate = getDefaultStartDate(),
    endDate = getDefaultEndDate(),
    filialId = "1",
  } = await searchParams;

  const query = new URLSearchParams({
    startDate,
    endDate,
    filialId,
  }).toString();

  const data = await getCardsCaixas(query);
  return (
    <div>
      <div className="w-full py-3 flex gap-4 px-5 bg-blue-950">
        <FilterDateRange />
        <FilterFilial />
      </div>

      <div className="py-3">
        <div className="w-full ">
          <div className="w-1/2 px-8 flex gap-3">
            <CardTotals
              title2="Falta Anterior"
              value2={data.cards.totalFaltaAnt}
              title="Falta Atual"
              value={data.cards.totalFalta}
              backgroundColor="bg-red-500"
            />
            <CardTotals
              title2="Sobra Anterior"
              value2={data.cards.totalSobraAnt}
              title="Sobra Atual"
              value={data.cards.totalSobra}
              backgroundColor="bg-blue-500"
            />
          </div>
        </div>
        <div className="w-1/2 px-5 h-[30vh]">
          <ChartLineDifs data={data.chartAnualDifs} />
        </div>
      </div>
    </div>
  );
}
