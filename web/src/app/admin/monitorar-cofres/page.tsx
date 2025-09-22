import { jwtDecode } from "jwt-decode";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ExtractList from "../components/list-extrato";
import { getExtract } from "@/app/api/post";
export default async function MonitorarCofres() {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) {
    redirect("/login");
  }
  return <ExtractList />;
}
