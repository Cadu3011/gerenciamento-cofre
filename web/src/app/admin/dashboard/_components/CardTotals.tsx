export default function CardTotals({
  title,
  value,
  backgroundColor,
}: {
  title: string;
  value: number;
  backgroundColor: string;
}) {
  return (
    <div className={`p-6 flex flex-col gap-2 items-center ${backgroundColor}`}>
      <p className="font-bold">{title}</p>
      <div className="text-5xl">{value}</div>
    </div>
  );
}
