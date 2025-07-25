import { apiPort } from "@/app/api/post";

async function getSaldos(filialId: string, token: string): Promise<any> {
  const Port = await apiPort();
  console.log(filialId);
  try {
    const [saldoAnt, saldoAt, filial] = await Promise.all([
      fetch(`http://localhost:${Port}/amount/ant`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => res.json()),
      fetch(`http://localhost:${Port}/amount/last`, {
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
      saldoAnt: saldoAnt.balance || "0",
      saldoAt: saldoAt.balance || "0",
      filial: filial.name || "0",
    };
  } catch (error) {
    return {
      saldoAnt: "0",
      saldoAt: "0",
      filial: "0",
    };
  }
}
interface Props {
  filialId: string;
  token: string;
}
export default async function HeaderCofre({ filialId, token }: Props) {
  const { saldoAnt, saldoAt, filial } = await getSaldos(filialId, token);

  return (
    <div className="w-full h-1/2 bg-blue-500 p-3 rounded-t-2xl flex justify-between">
      <div className=" w-64 rounded-2xl flex justify-center items-center font-bold text-3xl">
        Cofre {filial}
      </div>
      <div className="flex items-end gap-11  ">
        <div className="bg-white w-44 p-2 text-center rounded-2xl">
          Saldo anterior <div>{saldoAnt}</div>
        </div>
        <div className="bg-white w-44 p-2 mr-2 text-center rounded-2xl">
          Saldo Atual <div>{saldoAt}</div>
        </div>
      </div>
    </div>
  );
}
