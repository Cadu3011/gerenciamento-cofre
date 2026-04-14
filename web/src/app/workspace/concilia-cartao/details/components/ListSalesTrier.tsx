import { TableBody, TableCell, TableRow } from "@/components/ui/table";

interface Props {
  sales: any;
}

export default function ListSalesTrier({ sales }: Props) {
  return (
    <>
      {sales.trier.map((t: any, idx: number) => {
        const semMatch = t.status === "DIVERGENTE";
        return (
          <TableRow key={idx} className="w-1/2 text-base text-nowrap">
            <TableCell
              className={semMatch ? "bg-red-600 text-white text-center" : ""}
            >
              {t.documentoFiscal}
            </TableCell>
            <TableCell
              className={semMatch ? "bg-red-600 text-white text-center" : ""}
            >
              {t.modalidade}
            </TableCell>
            <TableCell
              className={semMatch ? "bg-red-600 text-white text-center" : ""}
            >
              {t.bandeira}
            </TableCell>
            <TableCell
              className={semMatch ? "bg-red-600 text-white text-center" : ""}
            >
              {t.hora}
            </TableCell>
            <TableCell
              className={semMatch ? "bg-red-600 text-white text-center" : ""}
            >
              {Number(t.valor).toFixed(2)}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
