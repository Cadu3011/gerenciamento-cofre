import { cookies } from "next/headers";
import SideBar from "./SideBar";
import { UserPayload } from "@/app/admin/gerenciar-cartao/page";
import { jwtDecode } from "jwt-decode";

export default async function Header() {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const userData = jwtDecode<UserPayload>(tokenCookie as string);
  return (
    <div className="bg-blue-950 sticky top-0 z-50 flex w-full items-center justify-between gap-3 border-b p-4 shadow">
      <div className="flex gap-10 w-1/2">
        <SideBar role={userData.roles} />
        <div className="bg-white px-2 py-4 rounded-lg">
          <p>GERENCIADOR FINANCEIRO</p>
        </div>
      </div>
    </div>
  );
}
