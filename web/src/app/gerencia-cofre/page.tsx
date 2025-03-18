import CardMovements from "@/components/form-cofre";
import HeaderCofre from "@/components/header-cofre";

export default function GerenciaCofre() {
  async function getSaldoAtual() {
    const cofre = await fetch("http://localhost:3000/amount/last/2");
    const saldo = await cofre.json();
    return String(saldo.balance);
  }

  return (
    <div className="bg-gray-200 flex items-center h-full ">
      <div className="bg-blue-500 w-max m-10 rounded">
        <div>
          <HeaderCofre />
        </div>
        <div className="p-8 flex items-center gap-2 ">
          <CardMovements title="Sangria" />
          <CardMovements title="Outras entradas" />
          <CardMovements title="Despesa" />
          <CardMovements title="Deposito" />
        </div>
      </div>
    </div>
  );
}
