import { LoginFormTrier } from "./components/FormLoginTrier";
import FormTotals from "./components/FormTotals";
import { cookies } from "next/headers";

export default async function GerenciaCartao() {
  const token: string | undefined = (await cookies()).get(
    "tokenLocalTrier"
  )?.value;

  return (
    <div className="w-full py-5">
      {token !== undefined ? <FormTotals /> : <LoginFormTrier token={token} />}
    </div>
  );
}
