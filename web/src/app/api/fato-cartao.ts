"use server";

import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";

const API = process.env.API_URL ?? "http://localhost:4000";

async function getToken() {
  return (await cookies()).get("access_token")?.value;
}

const getFatoCardsDashboardCached = (query: string) =>
  unstable_cache(
    async (token: string) => {
      const res = await fetch(`${API}/fatos/cartao-vendas/dashboard?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
    ["fato-cartao-dashboard", query],
    { revalidate: 300 },
  );

export async function getFatoCardsDashboard(query: string) {
  const token = await getToken();
  return getFatoCardsDashboardCached(query)(token ?? "");
}

const getFatoCardsFiltrosCached = unstable_cache(
  async (token: string) => {
    const res = await fetch(`${API}/fatos/cartao-vendas/filtros`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    return res.json();
  },
  ["fato-cartao-filtros"],
  { revalidate: 3600 },
);

export async function getFatoCardsFiltros() {
  const token = await getToken();
  return getFatoCardsFiltrosCached(token ?? "");
}