import { getCardsCaixas, getFiliais } from "@/app/api/post";
import CardTotals from "./_components/CardTotals";
import ChartLineDifs from "./_components/ChartLineDifs";
import ChartColumnsDifs from "./_components/ChartColunmsDifs";
import SidebarFilter from "./_components/SideBarFilter";
import TableDifs from "./_components/TableDifs";
import { fi } from "date-fns/locale";
import { formatDate } from "./utils";

type Props = {
  searchParams: {
    startDate?: string;
    endDate?: string;
    filialId?: string;
    operadorId?: string;
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
const filiais = await getFiliais();

export default async function Dashboard({ searchParams }: Props) {
  const {
    startDate = getDefaultStartDate(),
    endDate = getDefaultEndDate(),
    filialId = "1",
    operadorId = "",
  } = await searchParams;

  const query = new URLSearchParams({
    startDate,
    endDate,
    filialId,
    ...(operadorId && { operadorId }),
  }).toString();

  const data = await getCardsCaixas(query);
  return (
    <div className="flex gap-2">
      <div className="w-15 py-3 flex gap-4 px-5 bg-blue-950 justify-center">
        <SidebarFilter filiais={filiais} />
      </div>
      <div className="flex flex-col w-full">
        <div className="flex">
          <div className="py-3 w-full">
            <div className="w-full ">
              <div className="w-full px-8 flex gap-3">
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
                <div className="text-2xl p-2  rounded-md flex flex-col w-full bg-blue-950">
                  <p className="text-center w-full text-white">
                    Diferenças de Caixas
                  </p>
                  <div className="bg-white  flex flex-col w-full">
                    <p className="text-center">
                      {
                        filiais.find((f: any) => f.id === Number(filialId))
                          ?.name
                      }
                    </p>
                    <p className="text-center ">
                      {formatDate(startDate)} até <br />
                      {formatDate(endDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full px-5 pt-2 h-[30vh]">
              <p>TOTAIS FALTAS E SOBRAS ANUAL</p>
              <ChartLineDifs data={data.chartAnualDifs} />
            </div>
          </div>
          <div className="w-2/3 h-[50vh] overflow-y-auto  my-3">
            <TableDifs data={data.tableDifs} />
          </div>
        </div>
        <div className="w-full h-[35vh] my-2">
          <ChartColumnsDifs data={data.chartColunmsDifs} />
        </div>
      </div>
    </div>
  );
}
