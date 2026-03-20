import { getCardsCaixas } from "@/app/api/post";
import { FilterDateRange } from "./_components/FilterDateRange";
import FilterFilial from "./_components/FilterFilial";
import CardTotals from "./_components/CardTotals";

type Props = {
  searchParams: {
    startDate?: string;
    endDate?: string;
    filialId?: string;
  };
};

export default async function Dashboard({ searchParams }: Props) {
  const { startDate, endDate, filialId } = await searchParams;

  const query = new URLSearchParams({
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(filialId && { filialId }),
  }).toString();

  const cardData = await getCardsCaixas(query);
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
              title="Total de Falta"
              value={cardData.cards.totalFalta}
              backgroundColor="bg-red-500"
            />
            <CardTotals
              title="Total de Sobra"
              value={cardData.cards.totalSobra}
              backgroundColor="bg-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
