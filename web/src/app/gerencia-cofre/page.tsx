import CardMovements from "@/components/form-cofre";
import HeaderCofre from "@/components/header-cofre";
import { jwtDecode } from "jwt-decode";
import { cookies } from "next/headers";

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
    return <p>Usuário não autenticado</p>;
  }

  const userData = jwtDecode<UserPayload>(token);

  return (
    <div className="bg-gray-200 flex items-center h-full ">
      <div className="bg-blue-500 w-max m-10 rounded-2xl">
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
