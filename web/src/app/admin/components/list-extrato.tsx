"use client";

import { getExtract } from "@/app/api/post";
import React, { useState } from "react";

type Movement = {
  descrition: string;
  value: string;
  type: string;
};

type BalanceFisic = {
  id: number;
  value_100_50: string;
  value_20: string;
  value_10: string;
  value_5: string;
  value_2: string;
  value_moedas: string;
  value_reserva: string;
};

type Saldo = {
  id: number;
  balance: string;
  createdAt: string;
  updatedAt: string;
  movements: Movement[];
  balanceFisic: BalanceFisic[];
};

type FilialExtract = {
  filial: {
    id: number;
    name: string;
  };
  saldo: Saldo[];
};

// Helper para parsear valores que podem usar vírgula ou conter símbolos
const parseNumber = (v: string | number | undefined): number => {
  if (typeof v === "number") return v;
  if (!v) return 0;
  // remove tudo que não seja dígito, vírgula, ponto ou sinal de menos
  const cleaned = String(v)
    .replace(/[^\d\-,.]/g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

export default function ExtractList() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filialId, setFilialId] = useState<string>("");
  const [data, setData] = useState<FilialExtract[]>([]);
  const [loading, setLoading] = useState(false);

  // controle de exibição de movimentações por saldo.id
  const [openSaldos, setOpenSaldos] = useState<Record<string, boolean>>({});

  const toggleMovements = (saldoId: number) => {
    const key = String(saldoId);
    setOpenSaldos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFetch = async () => {
    if (!startDate || !endDate) {
      alert("Por favor, insira a data inicial e final.");
      return;
    }
    setLoading(true);
    try {
      const result = await getExtract(startDate, endDate, filialId);
      setData(result);
    } catch (err) {
      console.error("Erro ao buscar extrato:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-blue-600">Relatório de Filiais</h1>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-end bg-white p-4 rounded-2xl shadow border border-blue-100">
        <div className="flex flex-col">
          <label className="text-blue-700 font-medium mb-1">Data Inicial</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-blue-200 rounded p-2"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-blue-700 font-medium mb-1">Data Final</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-blue-200 rounded p-2"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-blue-700 font-medium mb-1">ID da Filial</label>
          <input
            type="number"
            value={filialId ?? ""}
            onChange={(e) => setFilialId(e.target.value ? e.target.value : "")}
            className="border border-blue-200 rounded p-2"
            placeholder="Opcional"
          />
        </div>
        <button
          onClick={handleFetch}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
        >
          Buscar
        </button>
      </div>

      {/* Carregando */}
      {loading && <p className="text-blue-600">Carregando...</p>}

      {/* Lista */}
      {data.map((f) => (
        <div
          key={f.filial.id}
          className="bg-white shadow rounded-2xl p-5 border border-blue-100"
        >
          <h2 className="text-xl font-semibold text-blue-700 mb-4">
            {f.filial.name}
          </h2>

          {f.saldo.length === 0 ? (
            <p className="text-gray-500">Nenhum saldo encontrado.</p>
          ) : (
            f.saldo.map((s) => {
              // calcular totais por tipo usando parseNumber
              const types = [
                "DESPESA",
                "DEPOSITO",
                "SANGRIA",
                "OUTRAS_ENTRADAS",
              ];

              const totalsByType = types.map((type) => {
                const total = s.movements
                  .filter((m) => m.type === type)
                  .reduce((acc, cur) => acc + parseNumber(cur.value), 0);

                return { type, total };
              });

              const isOpen = !!openSaldos[String(s.id)];

              return (
                <div
                  key={s.id}
                  className="mb-6 bg-blue-50 rounded-xl p-4 border border-blue-200"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-blue-800 font-semibold">
                      Saldo: R$ {s.balance}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>

                  <div className="mb-3 p-3 bg-blue-100 rounded-lg">
                    <h3 className="text-blue-700 font-medium mb-2">
                      Totais por Tipo
                    </h3>
                    <ul className="flex flex-wrap gap-4 text-blue-800 font-semibold">
                      {totalsByType.map((t) => (
                        <li key={t.type}>
                          {t.type}: R$ {t.total.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Botão para mostrar/ocultar Movements */}
                  <button
                    onClick={() => toggleMovements(s.id)}
                    className="mb-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    {isOpen ? "Ocultar" : "Detalhes"}
                  </button>

                  {/* Movements */}
                  {isOpen && (
                    <div className="mb-3">
                      <h3 className="text-blue-700 font-medium mb-2">
                        Movimentações
                      </h3>
                      {s.movements.length === 0 ? (
                        <p className="text-gray-400 text-sm">
                          Nenhuma movimentação
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {s.movements.map((m, i) => (
                            <li
                              key={i}
                              className="flex justify-between bg-white shadow-sm rounded-lg p-2 border border-gray-100"
                            >
                              <span className="text-gray-700">
                                {m.descrition}
                              </span>
                              <span
                                className={`font-semibold ${
                                  m.type === "DESPESA" || m.type === "DEPOSITO"
                                    ? "text-red-500"
                                    : "text-green-600"
                                }`}
                              >
                                {m.type} - R$ {m.value}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* BalanceFisic */}
                  <div>
                    <h3 className="text-blue-700 font-medium mb-2">
                      Caixa Físico
                    </h3>
                    {s.balanceFisic.length === 0 ? (
                      <p className="text-gray-400 text-sm">
                        Nenhum registro físico
                      </p>
                    ) : (
                      s.balanceFisic.map((b) => {
                        const totalFisico =
                          parseNumber(b.value_100_50) +
                          parseNumber(b.value_20) +
                          parseNumber(b.value_10) +
                          parseNumber(b.value_5) +
                          parseNumber(b.value_2) +
                          parseNumber(b.value_moedas) +
                          parseNumber(b.value_reserva);

                        return (
                          <div
                            key={b.id}
                            className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 space-y-3"
                          >
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">100/50:</span> R${" "}
                                {b.value_100_50}
                              </div>
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">20:</span> R${" "}
                                {b.value_20}
                              </div>
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">10:</span> R${" "}
                                {b.value_10}
                              </div>
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">5:</span> R${" "}
                                {b.value_5}
                              </div>
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">2:</span> R${" "}
                                {b.value_2}
                              </div>
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Moedas:</span> R${" "}
                                {b.value_moedas}
                              </div>
                              <div className="text-sm text-gray-600 col-span-2 sm:col-span-3">
                                <span className="font-medium">Reserva:</span> R${" "}
                                {b.value_reserva}
                              </div>
                            </div>

                            {/* Total físico */}
                            <div className="text-blue-900 font-bold text-right">
                              TOTAL FÍSICO: R$ {totalFisico.toFixed(2)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ))}
    </div>
  );
}
