import { jwtDecode } from "jwt-decode";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
interface UserPayload {
  sub: number;
  roles: string;
  filialId: number;
  iat: number;
  exp: number;
}
export default async function Admin() {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) {
    redirect("/login");
  }

  const userData = jwtDecode<UserPayload>(token);
  if (userData.roles !== "GESTOR") return;

  return (
    <div className="flex justify-center">
      <div className="  bg-blue-950 px-10 flex gap-3 flex-col justify-center rounded-md py-10">
        <div className="flex justify-center w-full gap-10">
          {" "}
          <div className=" bg-white py-5 px-5 text-lg w-full font-bold rounded-md">
            <div className="flex justify-center">Workspace</div>
          </div>
        </div>
        <div className="flex justify-between w-full gap-10">
          <Link
            href="/admin/gerencia-usuario"
            className="hover:bg-green-400 bg-white py-5 px-5 rounded-md"
          >
            Gerenciar Usuarios
          </Link>
          <Link
            href="/admin/gerencia-filial"
            className="hover:bg-green-400 bg-white py-5 px-5 rounded-md"
          >
            Gerenciar Filiais
          </Link>
          <Link
            href="/admin/monitorar-cofres"
            className="hover:bg-green-400 bg-white py-5 px-5 rounded-md"
          >
            Monitorar Cofres
          </Link>
          <Link
            href="/admin/gerenciar-cartao"
            className="hover:bg-green-400 bg-white py-5 px-5 rounded-md"
          >
            Gerenciar Cartões
          </Link>
          <Link
            href="/admin/conferir-caixas"
            className="hover:bg-green-400 bg-white py-5 px-5 rounded-md"
          >
            Conferir Caixas
          </Link>
          <Link
            href="/admin/gerenciar-tarefas"
            className="hover:bg-green-400 bg-white py-5 px-5 rounded-md"
          >
            Administrar Tarefas
          </Link>
        </div>
      </div>
    </div>
  );
}
