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
    <div className={`px-8 flex flex-col gap-2 items-center ${backgroundColor}`}>
      <div className="flex flex-col justify-center">
        <p className="font-bold">{title2}</p>
        <div className="text-2xl text-center">{value2}</div>
      </div>
      <p className="font-bold">{title}</p>
      <div className="text-4xl">{value}</div>
    </div>
  );
}
