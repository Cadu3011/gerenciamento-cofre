"use server";

import { cookies } from "next/headers";
import { apiUrl } from "../post";

export async function getTotalsRede(startDate: string, endDate: string) {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const Url = await apiUrl();
  const res = await fetch(
    `http://${Url}/rede?startDate=${startDate}&endDate=${endDate}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenCookie}`,
      },
      cache: "force-cache",
    }
  );
  const totals = res.json();
  return totals;
}
export async function getDetailsRede(date: string) {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const Url = await apiUrl();
  const res = await fetch(`http://${Url}/rede/details/${date}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCookie}`,
    },
    cache: "force-cache",
  });
  const details = res.json();
  return details;
}
