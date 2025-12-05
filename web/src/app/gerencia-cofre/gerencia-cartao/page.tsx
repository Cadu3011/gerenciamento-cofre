import { LoginFormTrier } from "./components/FormLoginTrier";
import FormTotals from "./components/FormTotals";
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
  const token: string | undefined = (await cookies()).get(
    "tokenLocalTrier"
  )?.value;
  const access_token = (await cookies()).get("access_token")?.value;
  if (!access_token) {
    return;
  }
  const user = jwtDecode<UserPayload>(access_token);
  return (
    <div className="w-full py-5">
      <div className="bg-blue-800 w-full flex justify-center items-center py-5">
        <p className="w-1/2  text-3xl text-white font-bold">
          Filial {user.filialId}
        </p>
      </div>
      {token !== undefined ? <FormTotals /> : <LoginFormTrier token={token} />}
    </div>
  );
}
