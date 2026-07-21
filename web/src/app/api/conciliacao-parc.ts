"use server";

import { cookies } from "next/headers";
import { ConciliacaoParcItem, TotalsParcDay } from "@/app/types/conciParc";

const API = "http://localhost:4000";

async function getToken() {
  return (await cookies()).get("access_token")?.value;
}

export async function getTotaisParcDia(
  from: string,
  to: string,
  filialId?: number,
): Promise<TotalsParcDay[]> {
  const token = await getToken();
  const params = new URLSearchParams({ from, to });
  if (filialId) params.set("filialId", String(filialId));

  const res = await fetch(`${API}/conciliacao-parc/totais-dia?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getParcelasByDate(
  date: string,
  filialId?: number,
): Promise<ConciliacaoParcItem[]> {
  const token = await getToken();
  const params = new URLSearchParams({ date });
  if (filialId) params.set("filialId", String(filialId));

  const res = await fetch(`${API}/conciliacao-parc?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getParcelasDivergentes(
  startDate: string,
  endDate: string,
  filialId?: number,
): Promise<ConciliacaoParcItem[]> {
  const token = await getToken();
  const params = new URLSearchParams({ startDate, endDate });
  if (filialId) params.set("filialId", String(filialId));

  const res = await fetch(`${API}/conciliacao-parc/divergentes?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function executePipelineParc(
  filialId: number,
  date: string,
): Promise<{ total: number; conciliados: number; divergentes: number } | null> {
  const token = await getToken();
  const res = await fetch(`${API}/conciliacao-parc`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filialId, date }),
  });
  if (!res.ok) return null;
  return res.json();
}
