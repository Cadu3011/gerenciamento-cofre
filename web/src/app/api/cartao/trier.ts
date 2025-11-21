"use server";
import { cookies } from "next/headers";
import { apiUrl } from "../post";
const Url = await apiUrl();
export async function getTotalsTrier(startDate: string, endDate: string) {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const tokenTrierLocal = (await cookies()).get("tokenLocalTrier")?.value;

  const res = await fetch(
    `http://${Url}/trier?dataEmissaoInicial=${startDate}&dataEmissaoFinal=${endDate}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenCookie}`,
        authTrierLocal: `Bearer ${tokenTrierLocal}`,
      },
      cache: "force-cache",
    }
  );

  const totalTrier = await res.json();
  return totalTrier;
}
export async function getDetailsTrier(date: string) {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const tokenTrierLocal = (await cookies()).get("tokenLocalTrier")?.value;

  const res = await fetch(`http://${Url}/trier/details?date=${date}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCookie}`,
      authTrierLocal: `Bearer ${tokenTrierLocal}`,
    },
    cache: "force-cache",
  });

  const totalTrier = await res.json();
  console.log(totalTrier);
  return totalTrier;
}
export async function LoginTrier(formData: FormData) {
  const login = formData.get("login") as string;
  const password = formData.get("password") as string;
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const data = {
    login: login,
    password,
  };
  const response = await fetch(`http://${Url}/trier`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCookie}`,
    },
    body: JSON.stringify(data),
  });
  console.log(response.status);
  if (
    response.status === 500 ||
    response.status === 404 ||
    response.status === 401
  ) {
    return { data: "dados invalidos" };
  }
  const token = await response.json();

  (await cookies()).set("tokenLocalTrier", token.tokenLocalTrier, {
    httpOnly: true,
  });
}
