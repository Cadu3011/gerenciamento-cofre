import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import ListTotals from "./components/ListTotals";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TotalsCardsDay } from "@/app/types/conciCards";
import FilterDateRange from "./components/FilterDate";
import FilterFilial from "./components/FilterFilial";
import { getFiliais } from "@/app/api/post";
export interface UserPayload {
  sub: number;
  roles: string;
  filialId: number;
  iat: number;
  exp: number;
}

type Props = {
  searchParams: {
    filialId: string;
    from?: string;
    to?: string;
  };
};
export default async function GerenciaCartao({ searchParams }: Props) {
  const filiais = await getFiliais();
  function getCurrentMonthRange() {
    const now = new Date();

    const from = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    return { from, to };
  }
  const range = getCurrentMonthRange();
  const {
    from = range.from,
    to = range.to,
    filialId = "1",
  } = await searchParams;

  const query = new URLSearchParams({
    from,
    to,
    filialId,
  }).toString();

  const access_token = (await cookies()).get("access_token")?.value;
  if (!access_token) {
    return;
  }
  const res = await fetch(
    `http://localhost:4000/conciliacao/totais-dia?${query}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
        cache: "no-store",
      },
    },
  );
  let data: TotalsCardsDay[] = [];
  let error: string | null = null;
  if (!res.ok) {
    error = `Erro ${res.status}`;
  } else {
    data = await res.json();
  }
  return (
    <div className="w-full flex flex-col gap-5">
      <div className="bg-blue-800 w-full flex justify-center items-center py-5">
        <p className="w-1/2  text-3xl text-white font-bold">
          Filial {filialId}
        </p>
      </div>
      <div className="flex flex-col  items-center relative h-[500px] overflow-y-auto mx-10">
        <div className="bg-blue-800 w-full py-4 rounded-t-lg gap-2 flex justify-center">
          <FilterDateRange />
          <FilterFilial filiais={filiais} />
        </div>
        <Table className="border border-black" noWrapper>
          <TableHeader className="bg-blue-950 sticky top-0 z-20">
            <TableRow>
              <TableHead className="text-white text-2xl">Data</TableHead>
              <TableHead className="text-white text-2xl">Trier</TableHead>
              <TableHead className="text-white text-2xl">Rede</TableHead>
              <TableHead className="text-white text-2xl">Cielo</TableHead>
              <TableHead className="text-white text-2xl">
                Total Divergencias
              </TableHead>
              <TableHead className="text-white text-2xl">
                Dif Conciliadas
              </TableHead>
              <TableHead className="text-white text-2xl">Detalhar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <ListTotals
              totalsCardsDay={data}
              filialId={Number(filialId)}
              error={error}
            />
          </TableBody>
          <TableFooter className="bg-blue-950">
            <TableRow>
              <TableCell colSpan={7}></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
