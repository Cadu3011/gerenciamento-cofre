import { apiPort } from "@/app/api/post";

async function getSaldos(filialId: string, token: string): Promise<any> {
  const Port = await apiPort()
  const [saldoAnt, saldoAt,filial] = await Promise.all([
    fetch(`http://localhost:${Port}/amount/ant/${filialId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).then((res) => res.json()),
    fetch(`http://localhost:${Port}/amount/last/${filialId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).then((res) => res.json()),
    fetch(`http://localhost:${Port}/filial/${filialId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).then((res) => res.json()),
  ]);
  return {
    saldoAnt: saldoAnt.balance,
    saldoAt: saldoAt.balance,
    filial: filial.name
  };
}
interface Props {
  filialId: string;
  token: string;
}
export default async function HeaderCofre({ filialId, token }: Props) {
  const { saldoAnt, saldoAt,filial } = await getSaldos(filialId, token);

  return (
    <div className="w-full h-32 bg-blue-500 p-16 rounded-t-2xl flex justify-between">
      <div className="bg-gray-400 w-64 rounded-3xl flex justify-center items-center font-bold text-3xl">
        {filial}
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
