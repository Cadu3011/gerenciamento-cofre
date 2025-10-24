import { getDetailsCielo } from "@/app/api/cartao/cielo";
import { getDetailsRede } from "@/app/api/cartao/rede";
import { getDetailsTrier } from "@/app/api/cartao/trier";

type params = {
  date: string;
};
const cardBrands = [
  { brandCode: 1, brand: "Mastercard" },
  { brandCode: 2, brand: "Visa" },
  { brandCode: 3, brand: "Diners" },
  { brandCode: 4, brand: "Cabal" },
  { brandCode: 5, brand: "Sicred" },
  { brandCode: 6, brand: "Sorocred" },
  { brandCode: 7, brand: "Hipercard" },
  { brandCode: 8, brand: "Cup" },
  { brandCode: 9, brand: "Calcard" },
  { brandCode: 10, brand: "Construcard" },
  { brandCode: 11, brand: "Avista" },
  { brandCode: 12, brand: "Mais!" },
  { brandCode: 13, brand: "Amex" },
  { brandCode: 14, brand: "Elo" },
  { brandCode: 15, brand: "Hiper" },
  { brandCode: 16, brand: "Alelo" },
  { brandCode: 20, brand: "Sodexo" },
  { brandCode: 21, brand: "VR" },
  { brandCode: 22, brand: "Greencard" },
  { brandCode: 23, brand: "Nutricash" },
  { brandCode: 24, brand: "Planvale" },
  { brandCode: 25, brand: "Verocheque" },
  { brandCode: 26, brand: "Coopercard" },
  { brandCode: 27, brand: "Abrapetite" },
  { brandCode: 28, brand: "Bamex Beneficios" },
  { brandCode: 29, brand: "Biq Benefícios" },
  { brandCode: 30, brand: "Bonuscred" },
  { brandCode: 31, brand: "Convenios Card" },
  { brandCode: 32, brand: "Credialimentacao" },
  { brandCode: 33, brand: "Eucard" },
  { brandCode: 34, brand: "Facecard" },
  { brandCode: 35, brand: "Flex" },
  { brandCode: 36, brand: "Goodcard" },
  { brandCode: 37, brand: "Lecard" },
  { brandCode: 38, brand: "Libercard" },
  { brandCode: 39, brand: "Maxxcard" },
  { brandCode: 40, brand: "Nutricard" },
  { brandCode: 41, brand: "Ok Cartoes" },
  { brandCode: 42, brand: "Onecard" },
  { brandCode: 43, brand: "Sindplus" },
  { brandCode: 44, brand: "UauhBeneficios" },
  { brandCode: 45, brand: "Vale Shop" },
  { brandCode: 46, brand: "Vegas Card" },
  { brandCode: 47, brand: "Visasoft Pay" },
  { brandCode: 48, brand: "Volus" },
  { brandCode: 49, brand: "Vscard" },
  { brandCode: 50, brand: "Up Brasil" },
  { brandCode: 51, brand: "Verocard" },
  { brandCode: 52, brand: "Ticket" },
  { brandCode: 53, brand: "Van" },
  { brandCode: 54, brand: "PLI itau FAI" },
  { brandCode: 55, brand: "PL Bradesco" },
  { brandCode: 56, brand: "PL Banco do Brasil" },
  { brandCode: 57, brand: "PL Citibank" },
  { brandCode: 58, brand: "PL Credsystem" },
  { brandCode: 59, brand: "PL Porto Seguro" },
  { brandCode: 60, brand: "Pagamento de Fatura" },
  { brandCode: 72, brand: "Nova Bandeira" },
  { brandCode: 74, brand: "Banescard" },
  { brandCode: 76, brand: "Jcb" },
  { brandCode: 77, brand: "Credz" },
  { brandCode: 999, brand: "Outros" },
];

export default async function ListDetails({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const cieloDetails = await getDetailsCielo(date);
  const redeDetails = await getDetailsRede(date);
  const trierDetails = await getDetailsTrier(date);

  const redeDetailsFormat = redeDetails.map((move) => ({
    hora: move.saleHour,
    valor: move.amount,
    adq: "rede",
    modalidade: move.modality.type,
    bandeira: cardBrands.find((c) => c.brandCode === move.brandCode)?.brand,
  }));
  const cieloDetailsFormat = cieloDetails.map((move) => {
    const hora = move.timeVenda.slice(0, 2);
    const min = move.timeVenda.slice(2, 4);
    const seg = move.timeVenda.slice(4, 6);

    const valor = Number(move._sum.valorBruto);
    return {
      hora: `${hora}:${min}:${seg}`,
      valor,
      adq: "cielo",
      modalidade: move.modalidade,
      bandeira: move.bandeira,
    };
  });

  const adquirentes = [...redeDetailsFormat, ...cieloDetailsFormat];
  const adquirentesOrdenation = adquirentes.sort((a, b) =>
    a.hora.localeCompare(b.hora)
  );
  function horaParaSegundos(hora: string) {
    const [h, m, s] = hora.split(":").map(Number);
    return h * 3600 + m * 60 + s;
  }

  const LIMITE_DIFERENCA = 300;

  const conciliacaoAdq = adquirentesOrdenation.map((adq) => {
    const trierMatch = trierDetails.find((t) => {
      if (Number(t.valor) !== adq.valor) return false;
      if (!t.hora || !adq.hora) return false;

      const diff = Math.abs(
        horaParaSegundos(t.hora) - horaParaSegundos(adq.hora)
      );

      return diff <= LIMITE_DIFERENCA;
    });
    return { ...adq, match: trierMatch };
  });
  const conciliacaoTrier = trierDetails.map((t) => {
    const adqMatch = adquirentesOrdenation.find((adq) => {
      if (adq.valor !== Number(t.valor)) return false;
      if (!t.hora || !adq.hora) return false;

      const diff = Math.abs(
        horaParaSegundos(adq.hora) - horaParaSegundos(t.hora)
      );

      return diff <= LIMITE_DIFERENCA;
    });
    return { ...t, match: adqMatch };
  });
  console.log(conciliacaoAdq[3], conciliacaoTrier[3]);

  return (
    <div className="w-full h-[600px] overflow-y-auto border">
      <div className="flex w-full min-w-max">
        {/* Tabela Trier */}
        <table className="w-full border-collapse">
          <thead className="bg-blue-800 text-white sticky top-0 z-10">
            <tr>
              <th className="border border-gray-300 " colSpan={5}>
                Trier
              </th>
              <th className="border border-gray-300 " colSpan={5}>
                Adquirentes
              </th>
            </tr>
            <tr>
              <th className="border border-gray-300 ">Codigo Venda</th>
              <th className="border border-gray-300 ">Modalidade</th>
              <th className="border border-gray-300 ">Bandeira</th>
              <th className="border border-gray-300 ">Hora Trier</th>
              <th className="border border-gray-300 ">Valor Trier</th>
              <th className="border border-gray-300 ">Hora adquirentes</th>
              <th className="border border-gray-300 ">Valor Adquirentes</th>

              <th className="border border-gray-300 ">Adquirente</th>
              <th className="border border-gray-300 ">Modalidade</th>
              <th className="border border-gray-300 ">Bandeira</th>
            </tr>
          </thead>
          <tbody>
            {conciliacaoTrier.map((move, i) => {
              const semMatchTrier = !move.match;
              const semMatchAdq = !conciliacaoAdq[i]?.match;

              return (
                <tr key={i} className="text-center">
                  {/* Trier */}
                  <td className={semMatchTrier ? "bg-red-500" : ""}>
                    {move.idVenda}
                  </td>
                  <td className={semMatchTrier ? "bg-red-500" : ""}>
                    {move.modalidade}
                  </td>
                  <td className={semMatchTrier ? "bg-red-500" : ""}>
                    {move.bandeira}
                  </td>
                  <td
                    className={`bg-blue-100 ${
                      semMatchTrier ? "bg-red-500 text-white" : ""
                    }`}
                  >
                    {move.hora}
                  </td>
                  <td
                    className={`bg-blue-100 ${
                      semMatchTrier ? "bg-red-500 text-white" : ""
                    }`}
                  >
                    {move.valor}
                  </td>

                  {/* Adquirente */}
                  <td
                    className={`bg-blue-100 ${
                      semMatchAdq ? "bg-yellow-500 text-black" : ""
                    }`}
                  >
                    {conciliacaoAdq[i]?.hora}
                  </td>
                  <td
                    className={`bg-blue-100 ${
                      semMatchAdq ? "bg-yellow-500 text-black" : ""
                    }`}
                  >
                    {conciliacaoAdq[i]?.valor}
                  </td>
                  <td className={semMatchAdq ? "bg-yellow-500" : ""}>
                    {conciliacaoAdq[i]?.adq}
                  </td>
                  <td className={semMatchAdq ? "bg-yellow-500" : ""}>
                    {conciliacaoAdq[i]?.modalidade}
                  </td>
                  <td className={semMatchAdq ? "bg-yellow-500" : ""}>
                    {conciliacaoAdq[i]?.bandeira}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
