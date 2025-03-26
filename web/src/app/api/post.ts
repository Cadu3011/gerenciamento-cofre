"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
export const apiPort = async ():Promise<string>=>{
  const Port = '5000'
  return Port
}
const Port = await apiPort()
export async function handleFormSubmit(formData: FormData) {
  
  const descrition = formData.get("description") as string;
  const value = formData.get("value") as string;
  const type = formData.get("type") as string;
  const filialId = Number(formData.get("filialId") as string);
  const token = formData.get("token") as string;
  const data = {
    descrition,
    value: parseInt(value),
    type,
    filialId,
  };
  const dataPost = await fetch(`http://localhost:${Port}/movement/${filialId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
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
  if (token.role === "GESTOR") {
    redirect("/admin");
  }
  redirect("/gerencia-cofre");
}
