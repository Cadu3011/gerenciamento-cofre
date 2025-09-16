"use client";
import { getBalanceFisics, handleFormBalanceFisic } from "@/app/api/post";
import InputComp from "@/components/input";
import { useEffect, useState } from "react";
import { useBalanceFisic } from "@/app/gerencia-cofre/components/BalanceFisicContext";

interface Props {
  onSuccess: () => void;
}
export default function FormBalanceFisic({ onSuccess }: Props) {
  const { refresh } = useBalanceFisic();

  const [value100_50, setValue100_50] = useState("0");
  const [value20, setValue20] = useState("0");
  const [value10, setValue10] = useState("0");
  const [value5, setValue5] = useState("0");
  const [value2, setValue2] = useState("0");
  const [valueMoedas, setValueMoedas] = useState("0");
  const [valueReserva, setValueReserva] = useState("0");
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true); // controla carregamento

  const fetchData = async () => {
    setLoading(true);
    try {
      const values = await getBalanceFisics();
      if (values.length !== 0) {
        setValue100_50(values[0].value_100_50);
        setValue20(values[0].value_20);
        setValue10(values[0].value_10);
        setValue5(values[0].value_5);
        setValue2(values[0].value_2);
        setValueMoedas(values[0].value_moedas);
        setValueReserva(values[0].value_reserva);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const sum =
      parseFloat(value100_50 || "0") +
      parseFloat(value20 || "0") +
      parseFloat(value10 || "0") +
      parseFloat(value5 || "0") +
      parseFloat(value2 || "0") +
      parseFloat(valueMoedas || "0") +
      parseFloat(valueReserva || "0");
    setTotal(sum);
  }, [
    value100_50,
    value20,
    value10,
    value5,
    value2,
    valueMoedas,
    valueReserva,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // previne envio enquanto carrega

    const formData = new FormData();
    formData.append("value100_50", value100_50);
    formData.append("value20", value20);
    formData.append("value10", value10);
    formData.append("value5", value5);
    formData.append("value2", value2);
    formData.append("valueMoedas", valueMoedas);
    formData.append("valueReserva", valueReserva);

    await handleFormBalanceFisic(formData);
    await fetchData();
    refresh();
    onSuccess();
  };

  return (
    <div className="flex justify-center items-center bg-slate-200 border border-black">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex justify-between bg-blue-500 h-8">
          <div className="ml-6 text-white font-bold">
            <h1>Valores Fisicos do Cofre</h1>
          </div>

          <div className="mr-6 bg-green-400 w-1/6 flex justify-center border border-black transition duration-75 ease-in-out transform hover:bg-green-600">
            <button
              className="w-full disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loader"></span>
                  Carregando...
                </>
              ) : (
                "OK"
              )}
            </button>
          </div>
        </div>

        {!loading && (
          <table className="table-auto w-full flex justify-center border-separate border-spacing-y-2">
            <tbody>
              <tr>
                <td>
                  <label htmlFor="100_50">100/50</label>
                </td>
                <td>
                  <InputComp
                    value={value100_50}
                    setValue={setValue100_50}
                    placeholder="100/50"
                    type="number"
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <label htmlFor="20">20</label>
                </td>
                <td>
                  <InputComp
                    value={value20}
                    setValue={setValue20}
                    placeholder="20"
                    type="number"
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <label htmlFor="10">10</label>
                </td>
                <td>
                  <InputComp
                    value={value10}
                    setValue={setValue10}
                    placeholder="10"
                    type="number"
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <label htmlFor="5">5</label>
                </td>
                <td>
                  <InputComp
                    value={value5}
                    setValue={setValue5}
                    placeholder="5"
                    type="number"
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <label htmlFor="2">2</label>
                </td>
                <td>
                  <InputComp
                    value={value2}
                    setValue={setValue2}
                    placeholder="2"
                    type="number"
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <label htmlFor="moedas">Moedas</label>
                </td>
                <td>
                  <InputComp
                    value={valueMoedas}
                    setValue={setValueMoedas}
                    placeholder="Moedas"
                    type="number"
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <label htmlFor="reserva">Reserva</label>
                </td>
                <td>
                  <InputComp
                    value={valueReserva}
                    setValue={setValueReserva}
                    placeholder="Reserva"
                    type="number"
                  />
                </td>
              </tr>
              <tr className="bg-emerald-400 flex justify-center items-center rounded-md mb-2">
                <td className="pt-2 pb-2 pr-2 ">
                  <label>Total</label>
                </td>
                <td>R$ {total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </form>
    </div>
  );
}
