export default function CardTotals({
  title,
  value,
  backgroundColor,
  fontSize,
  title2,
  value2,
  alertValue,
  fontBold,
}: {
  title: string;
  value: string;
  backgroundColor: string;
  fontSize: string;
  fontBold?: boolean;
  title2?: string;
  value2?: string;
  alertValue?: boolean;
}) {
  const valueFormat = Number(value);

  function formatNum(valor: string | number) {
    const numero = Number(valor || 0);

    const formatado = Math.abs(numero).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    return numero < 0
      ? `R$ - ${formatado.replace("R$", "").trim()}`
      : formatado;
  }
  return (
    <div
      className={`px-5 flex flex-col gap-2 items-center justify-center ${backgroundColor}`}
    >
      {title2 && value2 && (
        <div className="flex flex-col justify-center">
          <p className="font-bold text-center text-nowrap">{title2}</p>
          <div className="text-3xl text-center">{value2}</div>
        </div>
      )}
      <p className="font-bold">{title}</p>
      <div
        className={`${fontSize} ${
          alertValue
            ? valueFormat >= -100 && valueFormat <= 100
              ? "text-green-500"
              : valueFormat > 100
                ? "text-yellow-600"
                : "text-red-500"
            : ""
        } ${fontBold ? "font-bold" : ""} text-nowrap `}
      >
        {formatNum(value)}
      </div>
    </div>
  );
}
