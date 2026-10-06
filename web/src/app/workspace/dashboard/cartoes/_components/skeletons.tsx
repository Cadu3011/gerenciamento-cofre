export function SkeletonKpiRow() {
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

export function SkeletonFilterBar() {
  return (
    <div className="w-full px-10 animate-pulse">
      <div className="h-10 w-full max-w-3xl rounded-md bg-gray-200" />
    </div>
  );
}

export function SkeletonChartsRow() {
  return (
    <div className="w-full px-10 gap-5 flex justify-between animate-pulse">
      <div className="h-72 flex-1 rounded-lg bg-gray-200" />
      <div className="h-72 flex-1 rounded-lg bg-gray-200" />
    </div>
  );
}

export function SkeletonHealth() {
  return <div className="h-72 w-full rounded-lg bg-gray-200 animate-pulse" />;
}