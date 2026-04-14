"use client";
import {
  ConciliacaoDivergenteItem,
  ItensConciliados,
} from "@/app/types/conciCards";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ListSalesConciliados({
  data,
}: {
  data: ItensConciliados[];
}) {
  return (
    <Table noWrapper>
      <TableHeader className="sticky top-0 z-20 bg-blue-950 ">
        <TableRow>
          <TableHead className="text-white text-lg">Origem</TableHead>
          <TableHead className="text-white text-lg">Cod Venda</TableHead>
          <TableHead className="text-white text-lg">Modalidade</TableHead>
          <TableHead className="text-white text-lg">Bandeira</TableHead>
          <TableHead className="text-white text-lg">Hora</TableHead>
          <TableHead className="text-white text-lg">Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((s) => (
          <TableRow key={s.id} className="">
            <TableCell>{s.origem}</TableCell>
            <TableCell>
              {s.origem == "TRIER" ? s.documentoFiscal : s.nsu}
            </TableCell>
            <TableCell>{s.modalidade}</TableCell>
            <TableCell>{s.bandeira}</TableCell>
            <TableCell>{s.hora}</TableCell>
            <TableCell>{s.valor}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
