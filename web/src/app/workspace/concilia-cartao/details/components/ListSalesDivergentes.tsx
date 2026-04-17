"use client";
import { ConciliacaoDivergenteItem } from "@/app/types/conciCards";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ListSalesDiveregentes({
  data,
  selectedItems,
  setSelectedItems,
  lockedId,
}: {
  data: ConciliacaoDivergenteItem[];
  selectedItems: ConciliacaoDivergenteItem[];
  setSelectedItems: React.Dispatch<
    React.SetStateAction<ConciliacaoDivergenteItem[]>
  >;
  lockedId: number;
}) {
  function toggleItem(item: ConciliacaoDivergenteItem) {
    if (item.grupoId === lockedId) return;

    setSelectedItems((prev) => {
      const exists = prev.some((i) => i.grupoId === item.grupoId);

      if (exists) {
        return prev.filter((i) => i.grupoId !== item.grupoId);
      }

      return [...prev, item];
    });
  }
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
          <TableRow
            key={s.id}
            onClick={() => toggleItem(s)}
            className={`cursor-pointer ${
              selectedItems.some((i) => i.grupoId === s.grupoId)
                ? "bg-zinc-300 border-6 border-2 border-zinc-900 hover:bg-zinc-400"
                : ""
            } ${s.grupoId === lockedId ? "opacity-70 cursor-not-allowed" : ""}`}
          >
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
