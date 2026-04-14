import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
export interface UserPayload {
  sub: number;
  roles: string;
  filialId: number;
  iat: number;
  exp: number;
}
export default async function GerenciaCartao() {
  const access_token = (await cookies()).get("access_token")?.value;
  if (!access_token) {
    return;
  }
  const user = jwtDecode<UserPayload>(access_token);
  return (
    <div className="w-full ">
      <div className="bg-blue-800 w-full flex justify-center items-center py-5">
        <p className="w-1/2  text-3xl text-white font-bold">
          Filial {user.filialId}
        </p>
        <form action=""></form>
      </div>
    </div>
  );
}
