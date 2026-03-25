import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DialogCronJobs from "../../gerenciar-tarefas/components/DialogCronJobs";
import { Button } from "@/components/ui/button";
import { formatDate } from "../utils";

interface Props {
  data: {
    data: string;
    operador: string;
    falta: string;
    sobra: string;
    caixa: string;
  }[];
}

export default function TableDifs({ data }: Props) {
  return (
    <Table className="relative">
      <TableHeader className="bg-blue-950 sticky top-0 z-10">
        <TableRow className="">
          <TableHead className="text-white text-lg">Data</TableHead>
          <TableHead className="text-white text-lg">Operador</TableHead>
          <TableHead className="text-white text-lg bg-red-700">Falta</TableHead>
          <TableHead className="text-white text-lg bg-blue-700">
            Sobra
          </TableHead>
        </TableRow>
      </TableHeader>
      {data.length > 0 ? (
        <TableBody className="border border-black rounded-sm">
          {data.map((d, index) => (
            <TableRow
              key={d.caixa}
              className={
                index % 2 === 0
                  ? "bg-white hover:bg-zinc-400"
                  : "bg-gray-300 hover:bg-zinc-400 "
              }
            >
              <TableCell className="text-nowrap">
                {formatDate(String(d.data).split("T")[0])}
              </TableCell>
              <TableCell className=" ">
                {d.operador.split(" ").slice(0, 2).join(" ")}
              </TableCell>
              <TableCell className="bg-red-500">{d.falta}</TableCell>
              <TableCell className="bg-blue-500">{d.sobra}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      ) : (
        <TableBody>
          <TableRow>
            <TableCell colSpan={4} className="text-center">
              Sem diferenças para exibir
            </TableCell>
          </TableRow>
        </TableBody>
      )}
    </Table>
  );
}
