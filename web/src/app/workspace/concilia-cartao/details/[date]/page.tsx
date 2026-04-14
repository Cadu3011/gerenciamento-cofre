import { apiUrl } from "@/app/api/post";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ListSalesTrier from "../components/ListSalesTrier";
import ListSalesAdquirentes from "../components/ListSalesAdquirentes";

export default async function ListDetails({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const access_token = (await cookies()).get("access_token")?.value;
  if (!access_token) {
    redirect("/login");
  }
  const Url = await apiUrl();
  const { date } = await params;

  const res = await fetch(`http://${Url}/conciliacao?date=${date}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  const data = await res.json();
  return (
    <div className="flex flex-col justify-center items-center w-full ">
      <div className="items-end gap-2 w-full px-10 pt-5 flex justify-between bg-blue-950 text-white font-bold">
        <div>
          <p className="text-3xl">Data: {date}</p>
          <p className="text-3xl">a</p>
        </div>
      </div>
      <div className="relative w-full h-[600px]  overflow-y-auto border   scroll-wrapper">
        <div className="flex w-full px-4 divide-x">
          {/* ====================== TABELA TRIER ====================== */}
          <Table className="w-full" noWrapper>
            <TableHeader className="bg-blue-950 sticky top-0 z-20">
              <TableRow>
                <TableHead colSpan={5} className="text-white font-bold text-lg">
                  Trier
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="text-white text-lg">Cod Venda</TableHead>
                <TableHead className="text-white text-lg">Modalidade</TableHead>
                <TableHead className="text-white text-lg">Bandeira</TableHead>
                <TableHead className="text-white text-lg w-20">Hora</TableHead>
                <TableHead className="text-white text-lg w-20">Valor</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data ? (
                <ListSalesTrier sales={data} />
              ) : (
                <TableRow>
                  <td colSpan={5} className="text-center">
                    Sem tarefas
                  </td>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* ====================== TABELA ADQUIRENTES ====================== */}

          <Table className="w-full" noWrapper>
            <TableHeader className="bg-blue-950 sticky top-0 z-10">
              <TableRow>
                <TableHead colSpan={5} className="text-white font-bold text-lg">
                  Adquirentes
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="text-white text-lg">hora</TableHead>
                <TableHead className="text-white text-lg">Valor</TableHead>
                <TableHead className="text-white text-lg">Origem</TableHead>
                <TableHead className="text-white text-lg w-20">
                  Modalidade
                </TableHead>
                <TableHead className="text-white text-lg w-20">
                  Bandeira
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data ? (
                <ListSalesAdquirentes sales={data} />
              ) : (
                <div className="text-center">Sem tarefas para exibir</div>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
