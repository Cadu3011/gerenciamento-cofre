import CardMovements from "@/components/form-cofre";
import HeaderCofre from "@/components/header-cofre";
import { cookies } from "next/headers";

export default async function GerenciaCofre() {
  const token = (await cookies()).get("access_token")?.value;

  return (
    <div className="bg-gray-200 flex items-center h-full ">
      <div className="bg-blue-500 w-max m-10 rounded-2xl">
        <div>
          <HeaderCofre />
        </div>
        <div className="p-8 flex items-center gap-2 ">
          <CardMovements title="Sangria" type="SANGRIA" />
          <CardMovements title="Outras entradas" type="OUTRAS_ENTRADAS" />
          <CardMovements title="Despesa" type="DESPESA" />
          <CardMovements title="Deposito" type="DEPOSITO" />
        </div>
      </div>
    </div>
  );
}
