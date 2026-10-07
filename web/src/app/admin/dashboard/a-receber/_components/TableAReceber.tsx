import { formatNum } from "../../utils";

interface Faixa {
  label: string;
  trier: string;
  adquirentes: string;
  diferenca: string;
  vencidos: number;
  recebidos: number;
  faltaReceber: number;
}

interface Props {
  faixas: Faixa[];
}

export default function TableAReceber({ faixas }: Props) {
  return (
    <div className="w-full">
      <p className="text-lg font-semibold mb-3">
        Detalhamento por Faixa de Vencimento
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2 text-left">Faixa</th>
            <th className="border px-4 py-2 text-right">Trier</th>
            <th className="border px-4 py-2 text-right">Adquirentes</th>
            <th className="border px-4 py-2 text-right">Diferença</th>
            <th className="border px-4 py-2 text-right">Vencidos no período</th>
            <th className="border px-4 py-2 text-right">Recebidos de fato</th>
            <th className="border px-4 py-2 text-right">Falta receber</th>
          </tr>
        </thead>
        <tbody>
          {faixas.map((faixa) => {
            const dif = Number(faixa.diferenca);
            const falta = Number(faixa.faltaReceber);
            return (
              <tr key={faixa.label} className="hover:bg-gray-50">
                <td className="border px-4 py-2 font-medium">{faixa.label}</td>
                <td className="border px-4 py-2 text-right">
                  {formatNum(faixa.trier)}
                </td>
                <td className="border px-4 py-2 text-right">
                  {formatNum(faixa.adquirentes)}
                </td>
                <td
                  className={`border px-4 py-2 text-right ${
                    dif === 0
                      ? "text-green-600"
                      : dif < 0
                        ? "text-red-600"
                        : "text-yellow-600"
                  }`}
                >
                  {formatNum(faixa.diferenca)}
                </td>
                <td className="border px-4 py-2 text-right">
                  {formatNum(faixa.vencidos)}
                </td>
                <td className="border px-4 py-2 text-right">
                  {formatNum(faixa.recebidos)}
                </td>
                <td
                  className={`border px-4 py-2 text-right font-medium ${
                    falta === 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatNum(faixa.faltaReceber)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
