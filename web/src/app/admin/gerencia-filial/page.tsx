"use server";
import Filiais from "@/components/filiais";
import { jwtDecode } from "jwt-decode";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface UserPayload {
  sub: number;
  roles: string;
  filialId: number;
  iat: number;
  exp: number;
}
export default async function GerenciaFilial() {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) {
    redirect("/login");
  }

  const userData = jwtDecode<UserPayload>(token);

  return (
    <div className=" w-full flex justify-center items-center bg-gray-200">
      <div className="bg-slate-400 rounded">
        <div className="">
          <Filiais token={token} />
        </div>
      </div>
    </div>
  );
}
