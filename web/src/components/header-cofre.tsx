"use client";
import { apiPort } from "@/app/api/post";
import SumValuesFisics from "./sumValuesFisics";
import { useEffect, useState } from "react";
import { useCofreFisic } from "@/app/gerencia-cofre/components/cofreContext";

interface Props {
  filialId: string;
  token: string;
}
export default function HeaderCofre({ filialId, token }: Props) {
  const [saldoAnt, setSaldoAnt] = useState(["0", ""]);
  const [saldoAt, setSaldoAt] = useState("0");
  const [filial, setFilial] = useState("...");
  const { updatedAt } = useCofreFisic();

  useEffect(() => {
    async function fetchSaldos() {
      const Port = await apiPort();
      try {
        const [resAnt, resAt, resFilial] = await Promise.all([
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

        setSaldoAnt([resAnt.balance || "0", resAnt.createdAt]);
        setSaldoAt(resAt.balance || "0");
        setFilial(resFilial.name || "0");
      } catch (err) {
        setSaldoAnt(["0", ""]);
        setSaldoAt("0");
        setFilial("Erro");
      }
    }

    fetchSaldos();
  }, [updatedAt]);
  return (
    <div className="w-full h-1/2 bg-blue-500 p-3 flex justify-around rounded-t-2xl ">
      <div className=" w-64 rounded-2xl flex justify-center items-center font-bold text-3xl">
        Cofre {filial}
      </div>
      <div className="flex justify-end">
        <div className="flex items-end gap-11  ">
          <div className="bg-white w-44 p-2 text-center rounded-2xl">
            Saldo anterior <div>{saldoAnt[0]}</div>
          </div>
          <div className="bg-white w-44 p-2 text-center rounded-2xl">
            Valor Fisico
            <div>
              <SumValuesFisics />
            </div>
          </div>
          <div className="bg-white w-44 p-2 mr-2 text-center rounded-2xl">
            Saldo Atual <div>{saldoAt}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
