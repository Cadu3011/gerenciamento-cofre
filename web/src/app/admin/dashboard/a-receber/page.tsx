import { getFiliais } from "@/app/api/post";
import { getParcAReceber } from "@/app/api/conciliacao-parc";
import { getFatoParcFiltros } from "@/app/api/fato-parc";
import { formatDate, getDefaultStartDate, getDefaultEndDate } from "../utils";
import CardTotaisReceber from "./_components/CardTotaisReceber";
import ChartBarAReceber from "./_components/ChartBarAReceber";
import TableAReceber from "./_components/TableAReceber";
import DialogSaldoReceber from "./_components/DialogSaldoReceber";
import FilterBandeiraOrigem from "../cartoes/_components/FilterBandeiraOrigem";

type Props = {
  searchParams: {
    startDate?: string;
    endDate?: string;
    filialId?: string;
    adquirentes?: string;
    bandeiras?: string;
    bandeirasModo?: string;
    status?: string;
  };
};

export default async function AReceberPage({ searchParams }: Props) {
  const [filiais, filtros] = await Promise.all([
    getFiliais(),
    getFatoParcFiltros(),
  ]);

  const {
    startDate = getDefaultStartDate(),
    endDate = getDefaultEndDate(),
    filialId,
    adquirentes,
    bandeiras,
    bandeirasModo,
    status,
  } = await searchParams;

  const query = new URLSearchParams({
    startDate,
    endDate,
    ...(filialId && { filialId }),
    ...(adquirentes && { adquirentes }),
    ...(bandeiras && { bandeiras }),
    ...(bandeirasModo && { bandeirasModo }),
    ...(status && { status }),
  }).toString();
  const data = await getParcAReceber(query);

  if (!data)
    return (
      <div className="p-8 text-red-500">
        Erro ao carregar dados de A Receber
      </div>
    );

  const { faixas, chartBarras, totais } = data;

  // Cards "Vencido no periodo Trier/Adquirentes" = faixa Vencido (a única
  // com o range do período): vencimentos do período já vencidos. As demais
  // faixas são o pipeline global coerente.
  const vencido = faixas[0];
  const totalTrier = Number(vencido?.trier ?? 0);
  const totalAdq = Number(vencido?.adquirentes ?? 0);
  const totalDif = totalTrier - totalAdq;
  return (
    <div className="flex flex-col w-full p-6 gap-5">
      <div className="w-full flex gap-3">
        <CardTotaisReceber
          title="Vencido no periodo Trier"
          value={String(totalTrier)}
          backgroundColor="bg-blue-200"
        />
        <CardTotaisReceber
          title="Vencido no periodo Adquirentes"
          value={String(totalAdq)}
          backgroundColor="bg-orange-200"
        />
        <CardTotaisReceber
          title="Diferença"
          value={String(Math.abs(totalDif))}
          backgroundColor="bg-green-200"
        />
        <div className="text-2xl p-2 rounded-md flex flex-col w-full bg-blue-950">
          <p className="text-center w-full text-white">A Receber — Parcelas</p>
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

      <div className="w-full flex gap-3">
        <CardTotaisReceber
          title="A receber no período"
          value={String(totais?.vencimento ?? 0)}
          backgroundColor="bg-indigo-200"
        />
        <CardTotaisReceber
          title="Recebido"
          value={String(totais?.recebimento ?? 0)}
          backgroundColor="bg-emerald-200"
        />
        <DialogSaldoReceber saldo={totais?.saldo ?? 0} query={query} />
        <div className="text-2xl p-2 rounded-md flex flex-col w-full bg-indigo-950">
          <p className="text-center w-full text-white">
            Vencimentos vs Recebimentos
          </p>
          <div className="bg-white flex flex-col w-full">
            <p className="text-center">
              {totais?.recebiveis ?? 0} recebíveis gerados no período
            </p>
            <p className="text-center">
              {totais?.conciliados ?? 0} conciliados ·{" "}
              {totais?.divergentes ?? 0} divergentes · {totais?.semBaixa ?? 0}{" "}
              sem baixa
            </p>
          </div>
        </div>
      </div>
      <div className="w-full">
        <FilterBandeiraOrigem
          filtros={filtros}
          origemMulti
          comStatus
          bandeirasEmDialog
        />
      </div>
      <div className="w-full ">
        <ChartBarAReceber data={chartBarras ?? []} />
      </div>

      <div className="w-full">
        <TableAReceber faixas={faixas} />
      </div>
    </div>
  );
}
