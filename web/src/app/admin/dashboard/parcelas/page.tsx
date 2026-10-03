import { Suspense } from "react";
import { getFatoParcFiltros } from "@/app/api/fato-parc";
import { getDefaultStartDate, getDefaultEndDate, getAnoStart } from "../utils";
import FilterBandeiraOrigem from "../cartoes/_components/FilterBandeiraOrigem";
import {
  buildQuery,
  CardsRowSection,
  ConcHealthSection,
  DiffChartsSection,
  RankingsSection,
} from "./_components/DashboardSections";
import {
  SkeletonCardsRow,
  SkeletonConcHealth,
  SkeletonDiffCharts,
  SkeletonRankings,
} from "./_components/skeletons";

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

export default async function DashboardParcelas({ searchParams }: Props) {
  const {
    startDate = getDefaultStartDate(),
    endDate = getDefaultEndDate(),
    filialId,
    adquirentes,
    bandeiras,
    bandeirasModo,
    status,
  } = await searchParams;

  const params = {
    startDate,
    endDate,
    ...(filialId && { filialId }),
    ...(adquirentes && { adquirentes }),
    ...(bandeiras && { bandeiras }),
    ...(bandeirasModo && { bandeirasModo }),
    ...(status && { status }),
  };
  const query = buildQuery(params);
  // Janela do gráfico mensal: ano corrente, independente do período escolhido
  // nos filtros.
  const anoQuery = buildQuery({ ...params, startDate: getAnoStart() });

  return (
    <div className="flex gap-2">
      <div className="flex flex-col w-full">
        <div className="py-3 w-full flex flex-col gap-5">
          <Suspense fallback={<SkeletonCardsRow />}>
            <CardsRowSection
              query={query}
              filialId={filialId}
              startDate={startDate}
              endDate={endDate}
            />
          </Suspense>

          <Suspense fallback={null}>
            <FilterBarWrapper />
          </Suspense>

          <Suspense fallback={<SkeletonDiffCharts />}>
            <DiffChartsSection query={query} anoQuery={anoQuery} />
          </Suspense>

          <div className="w-full flex flex-col px-10 gap-10">
            <Suspense fallback={<SkeletonRankings />}>
              <RankingsSection query={query} />
            </Suspense>
            <Suspense fallback={<SkeletonConcHealth />}>
              <ConcHealthSection query={query} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

async function FilterBarWrapper() {
  const filtros = await getFatoParcFiltros();
  return (
    <div className="w-full px-10">
      <FilterBandeiraOrigem
        filtros={filtros as Record<string, string[]>}
        origemMulti
        comStatus
        bandeirasEmDialog
      />
    </div>
  );
}
