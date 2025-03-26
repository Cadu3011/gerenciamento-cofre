async function getSaldos(filialId: string, token: string): Promise<any> {
  const [saldoAnt, saldoAt] = await Promise.all([
    fetch(`http://localhost:3000/amount/ant/${filialId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).then((res) => res.json()),
    fetch(`http://localhost:3000/amount/last/${filialId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).then((res) => res.json()),
  ]);
  return {
    saldoAnt: saldoAnt.balance,
    saldoAt: saldoAt.balance,
  };
}
interface Props {
  filialId: string;
  token: string;
}
export default async function HeaderCofre({ filialId, token }: Props) {
  const { saldoAnt, saldoAt } = await getSaldos(filialId, token);

  return (
    <div className="w-full h-1/6 bg-blue-500 p-16 rounded-2xl flex justify-between">
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
