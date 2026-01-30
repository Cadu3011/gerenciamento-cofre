import CardMovements from "@/app/workspace/gerencia-cofre/components/form-cofre";
import HeaderCofre from "@/app/workspace/gerencia-cofre/components/header-cofre";
import ToggleModalClient from "@/app/workspace/gerencia-cofre/components/toggleModal";
import { jwtDecode } from "jwt-decode";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BalanceFisicProvider } from "./components/BalanceFisicContext";
import { CofreProvider } from "./components/cofreContext";

interface UserPayload {
  sub: number;
  roles: string;
  filialId: number;
  iat: number;
  exp: number;
}

export default async function GerenciaCofre() {
  const token = (await cookies()).get("access_token");
  const userData = jwtDecode<UserPayload>(token ? token.value : "");

  return (
    <div className=" flex items-center  ">
      <div className="bg-gray-600 m-10 rounded-2xl">
        <CofreProvider>
          <BalanceFisicProvider>
            <div>
              <HeaderCofre filialId={`${userData.filialId}`} />
            </div>
            <div className="flex justify-end mr-10">
              <ToggleModalClient />
            </div>
          </BalanceFisicProvider>
          <div className="p-8 flex  flex-wrap gap-2 items-stretch ">
            <CardMovements
              title="Sangria"
              type="SANGRIA"
              filialId={`${userData.filialId}`}
            />
            <CardMovements
              title="Outras entradas"
              type="OUTRAS_ENTRADAS"
              filialId={`${userData.filialId}`}
            />
            <CardMovements
              title="Despesa"
              type="DESPESA"
              filialId={`${userData.filialId}`}
            />
            <CardMovements
              title="Deposito"
              type="DEPOSITO"
              filialId={`${userData.filialId}`}
            />
          </div>
        </CofreProvider>
      </div>
    </div>
  );
}
