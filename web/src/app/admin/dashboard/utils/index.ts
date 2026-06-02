export function calculateDynamicMax(data: any[], margin = 0.15) {
  if (data.length === 0) return 100;

  const max = Math.max(...data);
  const withMargin = max * (1 + margin);

  // 🔹 se for valor (R$) → escala bonita com magnitude
  const magnitude = Math.pow(10, Math.floor(Math.log10(withMargin)));
  const rounded = Math.ceil(withMargin / magnitude) * magnitude;

  return rounded;
}

export function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function formatNum(valor: string | number) {
  const numero = Number(valor || 0);

  const formatado = Math.abs(numero).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return numero < 0 ? `R$ - ${formatado.replace("R$", "").trim()}` : formatado;
}
