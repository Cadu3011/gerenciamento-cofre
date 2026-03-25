import { getCardsCaixas } from "@/app/api/post";
import { FilterDateRange } from "./_components/FilterDateRange";
import FilterFilial from "./_components/FilterFilial";
import CardTotals from "./_components/CardTotals";
import ChartLineDifs from "./_components/ChartLineDifs";
import ChartColumnsDifs from "./_components/ChartColunmsDifs";
import SidebarFilter from "./_components/SideBarFilter";
import TableDifs from "./_components/TableDifs";

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
    <div className="flex gap-2">
      <div className="w-15 py-3 flex gap-4 px-5 bg-blue-950 justify-center">
        <SidebarFilter />
      </div>

      <div className="py-3 w-full">
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
        <div className="w-full px-5 pt-2 h-[30vh]">
          <p>TOTAIS FALTAS E SOBRAS ANUAIS</p>
          <ChartLineDifs data={data.chartAnualDifs} />
        </div>
        <div className="w-full h-[30vh] my-12">
          <ChartColumnsDifs data={data.chartColunmsDifs} />
        </div>
      </div>
      <div className="w-2/3 h-[80vh] overflow-y-auto border my-3 border-black">
        <TableDifs data={data.tableDifs} />
      </div>
    </div>
  );
}
