import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props<T> = {
  data: T[];
  onRowClick?: (item: T) => void;
  isSelected?: (item: T) => boolean;
  disabled?: (item: T) => boolean;
};

export function ConciliacaoTable<T extends any>({
  data,
  onRowClick,
  isSelected,
  disabled,
}: Props<T>) {
  return (
    <Table noWrapper>
      <TableHeader className="sticky top-0 bg-blue-950">
        <TableRow>
          <TableHead className="text-white">Origem</TableHead>
          <TableHead className="text-white">Cod Venda</TableHead>
          <TableHead className="text-white">Modalidade</TableHead>
          <TableHead className="text-white">Bandeira</TableHead>
          <TableHead className="text-white">Hora</TableHead>
          <TableHead className="text-white">Valor</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.map((item: any) => (
          <TableRow
            key={item.id}
            onClick={() => onRowClick?.(item)}
            className={`
              ${isSelected?.(item) ? "bg-zinc-300 hover:bg-zinc-400" : ""}
              ${disabled?.(item) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <TableCell>{item.origem}</TableCell>
            <TableCell>
              {item.origem === "TRIER" ? item.documentoFiscal : item.nsu}
            </TableCell>
            <TableCell>{item.modalidade}</TableCell>
            <TableCell>{item.bandeira}</TableCell>
            <TableCell>{item.hora}</TableCell>
            <TableCell>{item.valor}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
