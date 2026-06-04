import { formatDate, formatNum } from "@/app/admin/dashboard/utils";
import { Checkbox } from "@/components/ui/checkbox";
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
          <TableHead className="w-12 text-white">Sel.</TableHead>
          <TableHead className="text-white">Data</TableHead>
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
    ${
      item.origem === "TRIER"
        ? "bg-red-300 hover:bg-red-400"
        : "bg-yellow-300 hover:bg-yellow-400"
    }
    ${disabled?.(item) ? " cursor-not-allowed" : "cursor-pointer"}
  `}
          >
            <TableCell onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected?.(item)}
                disabled={disabled?.(item)}
                onCheckedChange={() => onRowClick?.(item)}
                className="
    data-[state=checked]:bg-blue-600
    data-[state=checked]:border-blue-600
    data-[state=checked]:text-white
  "
              />
            </TableCell>

            <TableCell>{formatDate(String(item.data).split("T")[0])}</TableCell>
            <TableCell>{item.origem}</TableCell>
            <TableCell>
              {item.origem === "TRIER" ? item.documentoFiscal : item.nsu}
            </TableCell>
            <TableCell>{item.modalidade}</TableCell>
            <TableCell>{item.bandeira}</TableCell>
            <TableCell>{item.hora}</TableCell>
            <TableCell>{formatNum(item.valor)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
