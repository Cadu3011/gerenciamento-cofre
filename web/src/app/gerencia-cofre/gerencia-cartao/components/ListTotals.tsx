import Decimal from "decimal.js";
import Link from "next/link";

interface Props {
  totalsRede: any[];
  totalsTrier: any[];
  totalsCielo: any[];
}

export default function ListTotals({
  totalsRede,
  totalsTrier,
  totalsCielo,
}: Props) {
  const datasUnicas = Array.from(
    new Set([
      ...totalsRede.map((t) => t.startDate),
      ...totalsTrier.map((t) => t.data),
      ...totalsCielo.map((t) => t.dataVenda),
    ])
  );

  const totais = datasUnicas.map((data) => {
    const rede = totalsRede.find((t) => t.startDate === data) || null;
    const trier = totalsTrier.find((t) => t.data === data) || null;
    const cielo = totalsCielo.find((t) => t.dataVenda === data) || null;
    const valorBrutos = new Decimal(cielo?._sum.valorBruto ?? 0);
    const amounts = new Decimal(rede?.amount ?? 0);

    const valorTotal = String(
      new Decimal(trier.total).plus(-valorBrutos.plus(amounts))
    );

    return {
      data,
      totalsRede: rede,
      totalsTrier: trier,
      totalsCielo: cielo,
      valorTotal,
    };
  });

  return (
    <div className="h-4/5 overflow-auto rounded-lg">
      <table className=" w-full border-collapse rounded-lg ">
        <thead className="bg-blue-800 text-white ">
          <tr className="h-10">
            <th className="border border-gray-300 ">Data</th>
            <th className="border border-gray-300">Trier</th>
            <th className="border border-gray-300">Rede</th>
            <th className="border border-gray-300">Cielo</th>
            <th className="border border-gray-300">Diferença total</th>
            <th className="border border-gray-300 ">Actions</th>
          </tr>
        </thead>
        <tbody className="font-bold">
          {totais.map((item) => (
            <tr
              key={item.data}
              className="border  border-gray-300 hover:bg-blue-200 transition text-center py-2"
            >
              <td className=" h-10">
                {(() => {
                  const [ano, mes, dia] = item.data.split("-");
                  const formatada = `${dia}/${mes}/${ano}`;
                  return formatada;
                })()}
              </td>

              <td className="text-blue-900   h-10">
                {item.totalsTrier?.total ?? "-"}
              </td>
              <td className="text-green-900 h-10">
                {item.totalsRede?.amount ?? "-"}
              </td>
              <td className="text-green-900 h-10">
                {Number(item.totalsCielo?._sum.valorBruto).toFixed(2) ?? "-"}
              </td>
              <td className="text-green-900">
                {Number(String(item.valorTotal)).toFixed(2) ?? "-"}
              </td>

              <td className="">
                <Link
                  href={`/gerencia-cofre/gerencia-cartao/details/${item.data}`}
                  className=""
                >
                  <button className=" p-3 text-center">...</button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
