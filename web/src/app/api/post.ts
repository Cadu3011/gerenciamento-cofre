"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";

export const apiPort = async (): Promise<string> => {
  const Port = "3000";
  return Port;
};
const Port = await apiPort();
export async function handleFormSubmit(formData: FormData) {
  const descrition = formData.get("description") as string;
  const value = formData.get("value") as string;
  const type = formData.get("type") as string;
  const filialId = Number(formData.get("filialId") as string);
  const token = formData.get("token") as string;
  const data = {
    descrition,
    value: value.replace(",", "."),
    type,
    filialId,
  };
  try {
    const dataPost = await fetch(`http://localhost:${Port}/movement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return JSON.stringify(dataPost);
  } catch (error) {
    console.log(error);
  }
}
interface UserPayload {
  sub: number;
  roles: string;
  filialId: number;
  iat: number;
  exp: number;
}
export async function handlePostLogin(formData: FormData) {
  const login = formData.get("login") as string;
  const password = formData.get("password") as string;

  const data = {
    login: parseInt(login),
    password,
  };
  const response = await fetch(`http://localhost:${Port}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const token = await response.json();
  (await cookies()).set("access_token", token.access_token, { httpOnly: true });
  const tokenCookie = (await cookies()).get("access_token")?.value;

  const userData = jwtDecode<UserPayload>(tokenCookie as string);

  if (userData.roles === "GESTOR") {
    redirect("/admin");
  }
  redirect("/gerencia-cofre");
}
export async function handleLogut() {
  (await cookies()).delete("access_token");
  redirect("/login");
}
export async function handleFormBalanceFisic(formData: FormData) {
  const value100_50 = formData.get("value100_50") as string;
  const value20 = formData.get("value20") as string;
  const value10 = formData.get("value10") as string;
  const value5 = formData.get("value5") as string;
  const value2 = formData.get("value2") as string;
  const valueMoedas = formData.get("valueMoedas") as string;
  const valueReserva = formData.get("valueReserva") as string;
  const BalanceFisics = await getBalanceFisics();
  const data = {
    value_100_50: value100_50.replace(",", "."),
    value_20: value20.replace(",", "."),
    value_10: value10.replace(",", "."),
    value_5: value5.replace(",", "."),
    value_2: value2.replace(",", "."),
    value_moedas: valueMoedas.replace(",", "."),
    value_reserva: valueReserva.replace(",", "."),
  };
  if (BalanceFisics.length !== 0) {
    try {
      const tokenCookie = (await cookies()).get("access_token")?.value;
      const dataPost = await fetch(`http://localhost:${Port}/balance-fisic`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenCookie}`,
        },
        body: JSON.stringify(data),
      });
      return JSON.stringify(dataPost);
    } catch (error) {
      console.log(error);
    }
  } else {
    try {
      const tokenCookie = (await cookies()).get("access_token")?.value;
      const dataPost = await fetch(`http://localhost:${Port}/balance-fisic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenCookie}`,
        },
        body: JSON.stringify(data),
      });
      return JSON.stringify(dataPost);
    } catch (error) {
      console.log(error);
    }
  }
}

export async function getBalanceFisics() {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const data = await fetch(`http://localhost:${Port}/balance-fisic`, {
    headers: {
      Authorization: `Bearer ${tokenCookie}`,
    },
  });
  const cash = await data.json();
  return cash;
}
export async function getMovementsAnt() {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const data = await fetch(`http://localhost:${Port}/movement/ant`, {
    headers: {
      Authorization: `Bearer ${tokenCookie}`,
    },
  });
  const cash = await data.json();
  return cash;
}
