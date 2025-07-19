import CardMovements from "@/components/form-cofre";
import HeaderCofre from "@/components/header-cofre";
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

export default async function GerenciaCofre() {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) {
    redirect("/login");
  }

  const userData = jwtDecode<UserPayload>(token);
  const isExpired = userData.exp * 1000 < Date.now();

  if (isExpired) {
    redirect("/login");
  }

  return (
    <div className="bg-gray-200 flex items-center h-full ">
      <div className="bg-gray-600 m-10 rounded-2xl">
        <div>
          <HeaderCofre filialId={`${userData.filialId}`} token={token} />
        </div>
        <div className="p-8 flex items-center gap-2 ">
          <CardMovements
            title="Sangria"
            type="SANGRIA"
            filialId={`${userData.filialId}`}
            token={token}
          />
          <CardMovements
            title="Outras entradas"
            type="OUTRAS_ENTRADAS"
            filialId={`${userData.filialId}`}
            token={token}
          />
          <CardMovements
            title="Despesa"
            type="DESPESA"
            filialId={`${userData.filialId}`}
            token={token}
          />
          <CardMovements
            title="Deposito"
            type="DEPOSITO"
            filialId={`${userData.filialId}`}
            token={token}
          />
        </div>
      </div>
    </div>
  );
}
