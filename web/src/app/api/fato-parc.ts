"use server";

import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";

const API = process.env.API_URL ?? "http://localhost:4000";

async function getToken() {
  return (await cookies()).get("access_token")?.value;
}

const getFatoParcDashboardCached = (query: string) =>
  unstable_cache(
    async (token: string) => {
      const res = await fetch(
        `${API}/fatos/cartao-parcelas/dashboard?${query}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return null;
      return res.json();
    },
    ["fato-parc-dashboard", query],
    { revalidate: 300 },
  );

export async function getFatoParcDashboard(query: string) {
  const token = await getToken();
  return getFatoParcDashboardCached(query)(token ?? "");
}

const getFatoParcFiltrosCached = unstable_cache(
  async (token: string) => {
    const res = await fetch(`${API}/fatos/cartao-parcelas/filtros`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    return res.json();
  },
  ["fato-parc-filtros"],
  { revalidate: 3600 },
);

export async function getFatoParcFiltros(): Promise<Record<string, string[]>> {
  const token = await getToken();
  return getFatoParcFiltrosCached(token ?? "");
}