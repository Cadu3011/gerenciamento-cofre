import { formatNum } from "../../../utils";

export default function CardTotaisReceber({
  title,
  value,
  backgroundColor,
}: {
  title: string;
  value: string;
  backgroundColor: string;
}) {
  return (
    <div className={`px-5 flex flex-col gap-2 items-center justify-center ${backgroundColor} rounded-lg`}>
      <p className="font-bold text-center">{title}</p>
      <div className="text-3xl font-bold text-nowrap">{formatNum(value)}</div>
    </div>
  );
}
