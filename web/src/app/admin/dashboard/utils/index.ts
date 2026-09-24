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

export const BANDEIRAS_PADRAO = [
  "PAGAMENTO ONLINE IFOOD",
  "PIX SEGURO - PAGGPIX",
  "BRASILCARD 1X",
  "BRASILCARD 2X",
  "BRASILCARD 3X",
];

export function getDefaultStartDate() {
  const today = new Date();
  const referenceDate =
    today.getDate() <= 5
      ? new Date(today.getFullYear(), today.getMonth() - 1, 1)
      : new Date(today.getFullYear(), today.getMonth(), 1);
  return referenceDate.toISOString().split("T")[0];
}

export function getDefaultEndDate() {
  const today = new Date();
  const referenceDate =
    today.getDate() <= 5
      ? new Date(today.getFullYear(), today.getMonth(), 0)
      : today;
  return referenceDate.toISOString().split("T")[0];
}

export function getAnoStart() {
  const hoje = new Date();
  return new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1)
    .toISOString()
    .split("T")[0];
}
