import { getDetailsCielo } from "@/app/api/cartao/cielo";
import { getDetailsRede } from "@/app/api/cartao/rede";
import { getDetailsTrier } from "@/app/api/cartao/trier";
import ButtonPDF from "../components/ButtonPdf";
import { UserPayload } from "../../page";
import { jwtDecode } from "jwt-decode";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type SearchParams = {
  diferenca: string | number;
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
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const tokenLocalTrier = (await cookies()).get("tokenLocalTrier")?.value;
  if (!tokenLocalTrier) {
    redirect("/gerencia-cofre/gerencia-cartao");
  }
  const access_token = (await cookies()).get("access_token")?.value;
  if (!access_token) {
    redirect("/login");
  }
  const user = jwtDecode<UserPayload>(access_token);
  const { diferenca } = await searchParams;

  const { date } = await params;

  const cieloDetails = await getDetailsCielo(date);
  const redeDetails = await getDetailsRede(date);
  const trierDetails = await getDetailsTrier(date);
  console.log(trierDetails);
  const redeDetailsFormat = redeDetails.map((move: any) => ({
    hora: move.saleHour,
    valor: move.amount,
    adq: "rede",
    modalidade: move.modality.type,
    bandeira: cardBrands.find((c) => c.brandCode === move.brandCode)?.brand,
  }));
  const cieloDetailsFormat = cieloDetails.map((move: any) => {
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
    const trierMatch = trierDetails.find((t: any) => {
      if (Number(t.valor) !== adq.valor) return false;
      if (!t.hora || !adq.hora) return false;

      const diff = Math.abs(
        horaParaSegundos(t.hora) - horaParaSegundos(adq.hora)
      );

      return diff <= LIMITE_DIFERENCA;
    });
    return { ...adq, match: trierMatch };
  });
  const conciliacaoTrier = trierDetails.map((t: any) => {
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

  return (
    <div className="flex flex-col justify-center items-center w-full container-relatorio">
      <div className="items-end gap-2 w-full px-10 pt-5 flex justify-between bg-blue-800 text-white font-bold">
        <div>
          <p className="text-3xl">Data: {date}</p>
          <p className="text-3xl">
            Diferença encontrada: R${Number(diferenca).toFixed(2)}
          </p>
        </div>
        <ButtonPDF
          fileName="relatorio"
          tableIds={["tabela-trier", "tabela-adq"]}
          filial={String(user.filialId)}
          data={date}
          dif={String(Number(diferenca).toFixed(2))}
        />
      </div>
      <div className="w-full h-[600px] overflow-y-auto border  scroll-wrapper">
        <div className="flex w-full ">
          <div className="flex w-full  px-4">
            {/* ====================== TABELA TRIER ====================== */}
            <table className="tabela  w-1/2 border-collapse border">
              <thead className="bg-blue-800 text-white sticky top-0">
                <tr>
                  <th colSpan={5} className="border">
                    Trier
                  </th>
                </tr>
                <tr>
                  <th className="border p-1">Cod Venda</th>
                  <th className="border p-1">Modalidade</th>
                  <th className="border p-1">Bandeira</th>
                  <th className="border p-1">Hora</th>
                  <th className="border p-1">Valor</th>
                </tr>
              </thead>

              <tbody>
                {conciliacaoTrier.map((t: any, idx: number) => {
                  const semMatch = !t.match;

                  return (
                    <tr key={idx} className="text-center">
                      <td
                        className={
                          semMatch ? "bg-red-600 text-white text-center" : ""
                        }
                      >
                        {t.idVenda}
                      </td>
                      <td
                        className={
                          semMatch ? "bg-red-600 text-white text-center" : ""
                        }
                      >
                        {t.modalidade}
                      </td>
                      <td
                        className={
                          semMatch ? "bg-red-600 text-white text-center" : ""
                        }
                      >
                        {t.bandeira}
                      </td>
                      <td
                        className={
                          semMatch ? "bg-red-600 text-white text-center" : ""
                        }
                      >
                        {t.hora}
                      </td>
                      <td
                        className={
                          semMatch ? "bg-red-600 text-white text-center" : ""
                        }
                      >
                        {Number(t.valor).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ====================== TABELA ADQUIRENTES ====================== */}
            <table className="tabela  w-1/2 border-collapse border">
              <thead className="bg-blue-800 text-white sticky top-0">
                <tr>
                  <th colSpan={5} className="border">
                    Adquirentes
                  </th>
                </tr>
                <tr>
                  <th className="border p-1">Hora</th>
                  <th className="border p-1">Valor</th>
                  <th className="border p-1">Adq</th>
                  <th className="border p-1">Modalidade</th>
                  <th className="border p-1">Bandeira</th>
                </tr>
              </thead>

              <tbody>
                {conciliacaoAdq.map((adq: any, idx: number) => {
                  const semMatch = !adq.match;

                  return (
                    <tr key={idx} className="text-center">
                      <td
                        className={
                          semMatch
                            ? "bg-yellow-400 text-black font-bold text-center"
                            : ""
                        }
                      >
                        {adq.hora}
                      </td>
                      <td
                        className={
                          semMatch
                            ? "bg-yellow-400 text-black font-bold text-center"
                            : ""
                        }
                      >
                        {Number(adq.valor).toFixed(2)}
                      </td>
                      <td
                        className={
                          semMatch
                            ? "bg-yellow-400 text-black font-bold text-center"
                            : ""
                        }
                      >
                        {adq.adq}
                      </td>
                      <td
                        className={
                          semMatch
                            ? "bg-yellow-400 text-black font-bold text-center"
                            : ""
                        }
                      >
                        {adq.modalidade}
                      </td>
                      <td
                        className={
                          semMatch
                            ? "bg-yellow-400 text-black font-bold text-center"
                            : ""
                        }
                      >
                        {adq.bandeira}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* tabela pra exportação */}
          <div className="w-full flex hidden px-4">
            {/* ====================== TABELA TRIER ====================== */}
            <table
              id="tabela-trier"
              className="tabela  w-1/2 border-collapse border"
            >
              <thead className="bg-blue-800 text-white sticky top-0">
                <tr>
                  <th colSpan={5} className="border">
                    Trier
                  </th>
                </tr>
                <tr>
                  <th className="border p-1">Cod Venda</th>
                  <th className="border p-1">Modalidade</th>
                  <th className="border p-1">Bandeira</th>
                  <th className="border p-1">Hora</th>
                  <th className="border p-1">Valor</th>
                </tr>
              </thead>

              <tbody>
                {conciliacaoTrier
                  .filter((t: any) => !t.match)
                  .map((t: any, idx: number) => {
                    const semMatch = !t.match;

                    return (
                      <tr key={idx} className="text-center">
                        <td
                          className={
                            semMatch ? "bg-red-600 text-white text-center" : ""
                          }
                        >
                          {t.idVenda}
                        </td>
                        <td
                          className={
                            semMatch ? "bg-red-600 text-white text-center" : ""
                          }
                        >
                          {t.modalidade}
                        </td>
                        <td
                          className={
                            semMatch ? "bg-red-600 text-white text-center" : ""
                          }
                        >
                          {t.bandeira}
                        </td>
                        <td
                          className={
                            semMatch ? "bg-red-600 text-white text-center" : ""
                          }
                        >
                          {t.hora}
                        </td>
                        <td
                          className={
                            semMatch ? "bg-red-600 text-white text-center" : ""
                          }
                        >
                          {Number(t.valor).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            {/* ====================== TABELA ADQUIRENTES ====================== */}
            <table
              id="tabela-adq"
              className="tabela  w-1/2 border-collapse border"
            >
              <thead className="bg-blue-800 text-white sticky top-0">
                <tr>
                  <th colSpan={5} className="border">
                    Adquirentes
                  </th>
                </tr>
                <tr>
                  <th className="border p-1">Hora</th>
                  <th className="border p-1">Valor</th>
                  <th className="border p-1">Adq</th>
                  <th className="border p-1">Modalidade</th>
                  <th className="border p-1">Bandeira</th>
                </tr>
              </thead>

              <tbody>
                {conciliacaoAdq
                  .filter((adq: any) => !adq.match)
                  .map((adq: any, idx: number) => {
                    const semMatch = !adq.match;

                    return (
                      <tr key={idx} className="text-center">
                        <td
                          className={
                            semMatch
                              ? "bg-yellow-400 text-black font-bold text-center"
                              : ""
                          }
                        >
                          {adq.hora}
                        </td>
                        <td
                          className={
                            semMatch
                              ? "bg-yellow-400 text-black font-bold text-center"
                              : ""
                          }
                        >
                          {Number(adq.valor).toFixed(2)}
                        </td>
                        <td
                          className={
                            semMatch
                              ? "bg-yellow-400 text-black font-bold text-center"
                              : ""
                          }
                        >
                          {adq.adq}
                        </td>
                        <td
                          className={
                            semMatch
                              ? "bg-yellow-400 text-black font-bold text-center"
                              : ""
                          }
                        >
                          {adq.modalidade}
                        </td>
                        <td
                          className={
                            semMatch
                              ? "bg-yellow-400 text-black font-bold text-center"
                              : ""
                          }
                        >
                          {adq.bandeira}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
