export default function CardKPI({
  title,
  value,
  sub,
  backgroundColor,
  emphasis = false,
}: {
  title: string;
  value: string;
  sub?: string;
  backgroundColor: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`px-5 py-3 flex flex-col gap-1 items-center justify-center rounded-lg ${backgroundColor}`}
    >
      <p className="font-bold text-center text-sm text-nowrap">{title}</p>
      <div
        className={`text-3xl text-nowrap font-bold ${
          emphasis ? "text-red-600" : ""
        }`}
      >
        {value}
      </div>
      {sub && <p className="text-xs text-gray-700 text-center">{sub}</p>}
    </div>
  );
}