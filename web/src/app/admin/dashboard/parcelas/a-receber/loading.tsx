export default function LoadingAReceber() {
  return (
    <div className="flex flex-col w-full p-6 gap-5 animate-pulse">
      <div className="w-full flex gap-3">
        <div className="h-24 flex-1 rounded-md bg-white border" />
        <div className="h-24 flex-1 rounded-md bg-white border" />
        <div className="h-24 flex-1 rounded-md bg-white border" />
        <div className="h-24 flex-1 rounded-md bg-white border" />
      </div>
      <div className="h-64 w-full rounded-lg bg-gray-200" />
      <div className="h-72 w-full rounded-lg bg-gray-200" />
    </div>
  );
}