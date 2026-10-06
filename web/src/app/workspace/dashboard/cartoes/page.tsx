import { Suspense } from "react";
import {
  ChartsRowSection,
  FilterSection,
  HealthDialogSection,
  HealthSection,
  KpiRowSection,
} from "./_components/DashboardSections";
import {
  SkeletonChartsRow,
  SkeletonFilterBar,
  SkeletonHealth,
  SkeletonKpiRow,
} from "./_components/skeletons";

type Props = {
  searchParams: {
    startDate?: string;
    endDate?: string;
    type?: string;
    adquirente?: string;
    bandeiras?: string;
    bandeirasModo?: string;
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

  const {
    startDate = getDefaultStartDate(),
    endDate = getDefaultEndDate(),
    type,
    adquirente,
    bandeiras,
    bandeirasModo,
  } = await searchParams;

  const fatoQuery = new URLSearchParams({
    startDate,
    endDate,
    ...(adquirente && { adquirente }),
    ...(bandeiras && { bandeiras }),
    ...(bandeirasModo && { bandeirasModo }),
  }).toString();

  const saudeQuery = new URLSearchParams({
    startDate,
    endDate,
    ...(type && { type }),
    skipSales: "true",
  }).toString();

  return (
    <div className="flex gap-2">
      <div className="flex flex-col w-full">
        <div className="">
          <div className="py-3 w-full flex flex-col gap-5">
            <Suspense fallback={<SkeletonKpiRow />}>
              <KpiRowSection
                startDate={startDate}
                endDate={endDate}
                fatoQuery={fatoQuery}
              />
            </Suspense>

            <Suspense fallback={<SkeletonFilterBar />}>
              <FilterSection />
            </Suspense>

            <Suspense fallback={<SkeletonChartsRow />}>
              <ChartsRowSection fatoQuery={fatoQuery} />
            </Suspense>

            <div className="w-full flex flex-col px-10 gap-10 ">
              <Suspense fallback={<SkeletonHealth />}>
                <HealthSection saudeQuery={saudeQuery} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
      <Suspense fallback={null}>
        <HealthDialogSection saudeQuery={saudeQuery} type={type} />
      </Suspense>
    </div>
  );
}