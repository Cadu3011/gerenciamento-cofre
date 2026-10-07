export function SkeletonCardsRow() {
  return (
    <div className="w-full px-8 flex gap-3 animate-pulse">
      <div className="h-28 flex-1 rounded-md bg-white border" />
      <div className="h-28 flex-1 rounded-md bg-white border" />
      <div className="h-28 flex-1 rounded-md bg-white border" />
      <div className="h-28 flex-1 rounded-md bg-white border" />
      <div className="h-28 flex-1 rounded-md bg-white border" />
    </div>
  );
}

export function SkeletonDiffCharts() {
  return (
    <div className="w-full px-10 gap-5 flex justify-between animate-pulse">
      <div className="h-72 w-1/2 rounded-lg bg-gray-200" />
      <div className="h-72 w-1/2 rounded-lg bg-gray-200" />
    </div>
  );
}

export function SkeletonRankings() {
  return (
    <div className="h-[40vh] w-full rounded-lg bg-gray-200 animate-pulse" />
  );
}

export function SkeletonConcHealth() {
  return <div className="h-72 w-full rounded-lg bg-gray-200 animate-pulse" />;
}
