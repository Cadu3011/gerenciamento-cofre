export default function CardTotals({
  title,
  value,
  backgroundColor,
  title2,
  value2,
}: {
  title: string;
  value: string;
  backgroundColor: string;
  title2: string;
  value2: string;
}) {
  return (
    <div
      className={`px-10 flex flex-col gap-2 items-center ${backgroundColor}`}
    >
      <div className="flex flex-col justify-center">
        <p className="font-bold text-center text-nowrap">{title2}</p>
        <div className="text-3xl text-center">{value2}</div>
      </div>
      <p className="font-bold">{title}</p>
      <div className="text-5xl">{value}</div>
    </div>
  );
}
