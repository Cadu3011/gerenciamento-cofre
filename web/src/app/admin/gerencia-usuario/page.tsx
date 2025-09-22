"use server";

import { jwtDecode } from "jwt-decode";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FormUser } from "../gerencia-filial/components/formUser";
export default async function GerenciaUser() {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) {
    redirect("/login");
  }
  return (
    <div className="flex justify-center items-center">
      <FormUser />
    </div>
  );
}
