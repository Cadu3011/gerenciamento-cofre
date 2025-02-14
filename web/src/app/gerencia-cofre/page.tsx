import CardMovements from "@/components/form-cofre";

export default function GerenciaCofre() {
  async function getSaldoAtual() {
    const cofre = await fetch("http://localhost:3000/amount/last/2");
    const saldo = await cofre.json();
    return String(saldo.balance);
  }

  return (
    <div className=" bg-gray-200 p-8 flex items-center gap-2 h-full">
      <CardMovements title="Sangria" />
      <CardMovements title="Outras entradas" />
      <CardMovements title="Despesa" />
      <CardMovements title="Deposito" />
    </div>
  );
}
