import { getFiliais } from "@/app/api/post";
import { getParcAReceber, getParcBandeiras } from "@/app/api/conciliacao-parc";
import { formatDate } from "../../utils";
import CardTotaisReceber from "./_components/CardTotaisReceber";
import ChartLineAReceber from "./_components/ChartLineAReceber";
import TableAReceber from "./_components/TableAReceber";
import FilterBandeira from "../../_components/FilterBandeira";

type Props = { searchParams: { startDate?: string; endDate?: string; filialId?: string; bandeiras?: string } };

export default async function AReceberPage({ searchParams }: Props) {
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

  const [filiais, bandeirasList] = await Promise.all([
    getFiliais(),
    getParcBandeiras(),
  ]);

  const { startDate = getDefaultStartDate(), endDate = getDefaultEndDate(), filialId, bandeiras } = await searchParams;

  const query = new URLSearchParams({ startDate, endDate, ...(filialId && { filialId }), ...(bandeiras && { bandeiras }) }).toString();
  const data = await getParcAReceber(query);

  if (!data) return <div className="p-8 text-red-500">Erro ao carregar dados de A Receber</div>;

  const { faixas, chartLinhas } = data;

  const totalTrier = faixas.reduce((acc: number, f: any) => acc + Number(f.trier), 0);
  const totalAdq = faixas.reduce((acc: number, f: any) => acc + Number(f.adquirentes), 0);
  const totalDif = totalAdq - totalTrier;

  return (
    <div className="flex flex-col w-full p-6 gap-5">
      <div className="w-full flex gap-3">
        <CardTotaisReceber title="A Receber Trier" value={String(totalTrier)} backgroundColor="bg-blue-200" />
        <CardTotaisReceber title="A Receber Adquirentes" value={String(totalAdq)} backgroundColor="bg-orange-200" />
        <CardTotaisReceber title="Diferença" value={String(Math.abs(totalDif))} backgroundColor="bg-green-200" />
        <div className="text-2xl p-2 rounded-md flex flex-col w-full bg-blue-950">
          <p className="text-center w-full text-white">A Receber — Parcelas</p>
          <div className="bg-white flex flex-col w-full">
            <p className="text-center">{filiais.find((f: any) => f.id === Number(filialId))?.name || "todos"}</p>
            <p className="text-center">{formatDate(startDate)} até {formatDate(endDate)}</p>
          </div>
        </div>
      </div>

      <div className="w-full">
        <FilterBandeira bandeiras={bandeirasList} />
      </div>
      <div className="w-full">
        <ChartLineAReceber data={chartLinhas} />
      </div>

      <div className="w-full">
        <TableAReceber faixas={faixas} />
      </div>
    </div>
  );
}
