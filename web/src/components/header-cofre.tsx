"use client";
import { fetchSaldos } from "@/app/api/post";
import SumValuesFisics from "./sumValuesFisics";
import { useEffect, useState } from "react";
import { useCofreFisic } from "@/app/gerencia-cofre/components/cofreContext";

interface Props {
  filialId: string;
}
export default function HeaderCofre({ filialId }: Props) {
  const [saldoAnt, setSaldoAnt] = useState(["0", ""]);
  const [saldoAt, setSaldoAt] = useState("0");
  const [filial, setFilial] = useState("...");
  const { updatedAt } = useCofreFisic();

  useEffect(() => {
    async function fetchSaldosInfo() {
      const saldosInfo = await fetchSaldos(filialId);

      setSaldoAnt([
        saldosInfo.saldosInfo.saldoAnt,
        saldosInfo.saldosInfo.dataSaldoAnt.split("T")[0],
      ]);
      setSaldoAt(saldosInfo.saldosInfo.saldoAtual);
      setFilial(saldosInfo.saldosInfo.filialName);
    }
    fetchSaldosInfo();
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
            <div>{saldoAnt[1]}</div>
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
