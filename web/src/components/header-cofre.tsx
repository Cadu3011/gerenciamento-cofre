async function getSaldos(): Promise<any> {
  const [saldoAnt, saldoAt] = await Promise.all([
    fetch("http://localhost:3000/amount/ant/3").then((res) => res.json()),
    fetch("http://localhost:3000/amount/last/3").then((res) => res.json()),
  ]);
  return {
    saldoAnt: saldoAnt.balance,
    saldoAt: saldoAt.balance,
  };
}

export default async function HeaderCofre() {
  const { saldoAnt, saldoAt } = await getSaldos();

  return (
    <div className="w-full h-1/5 bg-blue-500 p-16 rounded-2xl flex justify-between">
      <div className="bg-gray-400 w-64 rounded-3xl flex justify-center items-center font-bold text-3xl">
        LOJA
      </div>
      <div className="flex items-end gap-11 p-5 ">
        <div className="bg-white w-44 p-1 text-center rounded">
          Saldo anterior {saldoAnt}
        </div>
        <div className="bg-white w-44 p-1 text-center rounded">
          Saldo Atual {saldoAt}
        </div>
      </div>
    </div>
  );
}
