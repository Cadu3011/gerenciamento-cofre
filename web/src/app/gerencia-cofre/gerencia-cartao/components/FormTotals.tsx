"use client";

import { getTotalsRede } from "@/app/api/cartao/rede";
import { useEffect, useState } from "react";
import ListTotals from "./ListTotals";
import { getTotalsCielo } from "@/app/api/cartao/cielo";
import { getTotalsTrier } from "@/app/api/cartao/trier";

export default function FormTotals() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalsRede, setTotalsRede] = useState([]);
  const [totalsCielo, setTotalsCielo] = useState([]);
  const [totalsTrier, setTotalsTrier] = useState([]);
  const [showTotals, setShowTotals] = useState(false);
  const [loading, setLoading] = useState(false);
  const fetchTotals = async () => {
    setLoading(true);
    const resTrier = await getTotalsTrier(startDate, endDate);
    const resRede = await getTotalsRede(startDate, endDate);
    const resCielo = await getTotalsCielo(startDate, endDate);

    setTotalsCielo(resCielo);
    setTotalsRede(resRede);
    setTotalsTrier(resTrier);

    setLoading(false);
    setShowTotals(true);
  };
  useEffect(() => {
    const fetchTotalsLastDays = async () => {
      setLoading(true);
      const dataAtual = new Date();
      const year = dataAtual.getUTCFullYear();
      const month = dataAtual.getUTCMonth() + 1;
      const day = dataAtual.getUTCDate();
      const startDateFormat = `${year}-${month}-${day - 7}`;
      const endDateFormat = `${year}-${month}-${day - 1}`;
      console.log(startDateFormat);
      const resTrier = await getTotalsTrier(startDateFormat, endDateFormat);
      const resRede = await getTotalsRede(startDateFormat, endDateFormat);
      const resCielo = await getTotalsCielo(startDateFormat, endDateFormat);

      setTotalsCielo(resCielo);
      setTotalsRede(resRede);
      setTotalsTrier(resTrier);

      setLoading(false);
      setShowTotals(true);
    };
    fetchTotalsLastDays();
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 h-full ">
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
        <button
          onClick={fetchTotals}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
        >
          Buscar
        </button>
      </div>
      {loading && (
        <div>
          <svg
            className="animate-spin h-10 w-10 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
        </div>
      )}
      {showTotals && (
        <div className="w-1/2 h-full">
          <ListTotals
            totalsRede={totalsRede}
            totalsTrier={totalsTrier}
            totalsCielo={totalsCielo}
          />
        </div>
      )}
    </div>
  );
}
