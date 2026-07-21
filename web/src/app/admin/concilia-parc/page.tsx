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
import { TotalsParcDay } from "@/app/types/conciParc";
import FilterDateRange from "./components/FilterDate";
import FilterFilial from "./components/FilterFilial";
import { getFiliais } from "@/app/api/post";
import { getTotaisParcDia } from "@/app/api/conciliacao-parc";

interface UserPayload {
  sub: number;
  roles: string;
  filialId: number;
  iat: number;
  exp: number;
}

type Props = {
  searchParams: Promise<{
    filialId?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function ConciliaParc({ searchParams }: Props) {
  const filiais = await getFiliais();
  const params = await searchParams;

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
  } = params;

  const access_token = (await cookies()).get("access_token")?.value;
  if (!access_token) return;

  const userData = jwtDecode<UserPayload>(access_token);
  if (userData.roles !== "GESTOR") return;

  let data: TotalsParcDay[] = [];
  let error: string | null = null;

  try {
    data = await getTotaisParcDia(from, to, Number(filialId));
  } catch {
    error = "Erro ao carregar dados";
  }

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="bg-blue-800 w-full flex justify-center items-center py-5">
        <p className="w-1/2 text-3xl text-white font-bold">
          Conciliação de Parcelas — Filial {filialId}
        </p>
      </div>
      <div className="flex flex-col items-center relative h-[500px] overflow-y-auto mx-10">
        <div className="bg-blue-800 w-full py-4 rounded-t-lg gap-2 flex justify-center">
          <FilterDateRange />
          <FilterFilial filiais={filiais} />
        </div>
        <Table className="border border-black" noWrapper>
          <TableHeader className="bg-blue-950 sticky top-0 z-20">
            <TableRow>
              <TableHead className="text-white text-2xl">Data</TableHead>
              <TableHead className="text-white text-2xl">
                Conciliados
              </TableHead>
              <TableHead className="text-white text-2xl">
                Divergentes
              </TableHead>
              <TableHead className="text-white text-2xl">
                Não Encontrado
              </TableHead>
              <TableHead className="text-white text-2xl">Detalhar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <ListTotals
              totalsParcDay={data}
              filialId={Number(filialId)}
              error={error}
            />
          </TableBody>
          <TableFooter className="bg-blue-950">
            <TableRow>
              <TableCell colSpan={5}></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
