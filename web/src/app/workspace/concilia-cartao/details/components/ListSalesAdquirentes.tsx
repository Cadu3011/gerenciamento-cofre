import { TableBody, TableCell, TableRow } from "@/components/ui/table";

interface Props {
  sales: any;
}

export default function ListSalesAdquirentes({ sales }: Props) {
  return (
    <>
      {sales.outros.map((adq: any, idx: number) => {
        const semMatch = adq.status === "DIVERGENTE";
        return (
          <TableRow key={idx} className="w-1/2 text-base text-nowrap">
            <TableCell
              className={
                semMatch ? "bg-yellow-400 text-black font-bold text-center" : ""
              }
            >
              {adq.hora}
            </TableCell>
            <TableCell
              className={
                semMatch ? "bg-yellow-400 text-black font-bold text-center" : ""
              }
            >
              {adq.valor}
            </TableCell>
            <TableCell
              className={
                semMatch ? "bg-yellow-400 text-black font-bold text-center" : ""
              }
            >
              {adq.origem}
            </TableCell>
            <TableCell
              className={
                semMatch ? "bg-yellow-400 text-black font-bold text-center" : ""
              }
            >
              {adq.modalidade}
            </TableCell>
            <TableCell
              className={semMatch ? "bg-yellow-400 text-black font-bold " : ""}
            >
              {adq.bandeira}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
