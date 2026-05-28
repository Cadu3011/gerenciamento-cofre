import { getCardsTotalCards, getFiliais } from "@/app/api/post";
import CardTotals from "../_components/CardTotals";
import { formatDate } from "../utils";

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
    const date = new Date();

    return new Date(date.getFullYear(), date.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  }

  function getDefaultEndDate() {
    return new Date().toISOString().split("T")[0];
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
  console.log(data.kpiConciTrier);
  return (
    <div className="flex gap-2">
      <div className="flex flex-col w-full">
        <div className="flex">
          <div className="py-3 w-full">
            <div className="w-full ">
              <div className="w-full px-8 flex gap-3">
                <CardTotals
                  title="Total Trier"
                  value={data.erp}
                  backgroundColor="bg-blue-200"
                  fontSize="text-4xl"
                  fontBold
                />
                <CardTotals
                  title="Total Adquirentes"
                  value={data.adquirentes}
                  backgroundColor="bg-orange-200"
                  fontSize="text-4xl"
                  fontBold
                />
                <CardTotals
                  title="Total Diferença"
                  value={String(data.diferenca * -1)}
                  backgroundColor="bg-green-200"
                  fontSize="text-4xl"
                  fontBold
                />
                <CardTotals
                  title="Diferença não Conciliada"
                  value={String(data.naoConciliados * -1)}
                  backgroundColor="bg-zinc-100"
                  fontSize="text-4xl"
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
          </div>
        </div>
      </div>
    </div>
  );
}
