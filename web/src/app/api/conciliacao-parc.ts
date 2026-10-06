"use server";

import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import {
  ConciliacaoParcItem,
  ParcListResult,
  TotalsParcDay,
} from "@/app/types/conciParc";

const API = process.env.API_URL ?? "http://localhost:4000";

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

export interface ParcListFilters {
  status?: string[];
  bandeiras?: string[];
  divergencias?: string[];
}

function appendFilters(
  params: URLSearchParams,
  filters?: ParcListFilters,
) {
  if (filters?.status?.length) params.set("status", filters.status.join(","));
  if (filters?.bandeiras?.length)
    params.set("bandeiras", filters.bandeiras.join(","));
  if (filters?.divergencias?.length)
    params.set("divergencias", filters.divergencias.join(","));
}

export async function getParcelasByDate(
  date: string,
  filialId?: number,
  filters?: ParcListFilters,
  page = 1,
  pageSize = 100,
): Promise<ParcListResult> {
  const token = await getToken();
  const params = new URLSearchParams({ date });
  if (filialId) params.set("filialId", String(filialId));
  appendFilters(params, filters);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  const res = await fetch(`${API}/conciliacao-parc?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totais: {
        conciliados: 0,
        divergentes: 0,
        naoEncontrados: 0,
        trierValor: 0,
        outraValor: 0,
        diferencaValor: 0,
        trierLiquido: 0,
        outraLiquido: 0,
        diferencaLiquido: 0,
        trierTaxa: 0,
        outraTaxa: 0,
      },
    };
  }
  return res.json();
}

export async function getParcelasDivergentes(
  startDate: string,
  endDate: string,
  filialId?: number,
  filters?: ParcListFilters,
  page = 1,
  pageSize = 100,
): Promise<{ items: ConciliacaoParcItem[]; total: number; page: number; pageSize: number }> {
  const token = await getToken();
  const params = new URLSearchParams({ startDate, endDate });
  if (filialId) params.set("filialId", String(filialId));
  appendFilters(params, filters);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  const res = await fetch(`${API}/conciliacao-parc/divergentes?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { items: [], total: 0, page, pageSize };
  return res.json();
}

const getParcDashboardCached = (query: string) =>
  unstable_cache(
    async (token: string) => {
      const res = await fetch(
        `${API}/conciliacao-parc/dashboard/parcelas?${query}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return null;
      return res.json();
    },
    ["parc-dashboard", query],
    { revalidate: 300 },
  );

export async function getParcDashboard(query: string) {
  const token = await getToken();
  return getParcDashboardCached(query)(token ?? "");
}

const getParcAReceberCached = (query: string) =>
  unstable_cache(
    async (token: string) => {
      const res = await fetch(
        `${API}/conciliacao-parc/dashboard/a-receber?${query}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return null;
      return res.json();
    },
    ["parc-a-receber", query],
    { revalidate: 300 },
  );

export async function getParcAReceber(query: string) {
  const token = await getToken();
  return getParcAReceberCached(query)(token ?? "");
}

const getParcBandeirasCached = unstable_cache(
  async (token: string) => {
    const res = await fetch(`${API}/conciliacao-parc/dashboard/bandeiras`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
  },
  ["parc-bandeiras"],
  { revalidate: 3600 },
);

export async function getParcBandeiras(): Promise<string[]> {
  const token = await getToken();
  return getParcBandeirasCached(token ?? "");
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