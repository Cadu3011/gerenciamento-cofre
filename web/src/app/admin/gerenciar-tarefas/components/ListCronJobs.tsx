import { CronJob } from "@/app/types/jobs";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";

export default function ListCronJobs({ cronJobs }: { cronJobs: CronJob[] }) {
  if (cronJobs.length === 0) {
    return null;
  }
  const formatDateTime = (date: Date | string) => {
    const parsedDate = new Date(date);

    const formattedDate = parsedDate.toLocaleDateString("pt-BR");
    const formattedTime = parsedDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${formattedDate} ${formattedTime}`;
  };
  return (
    <TableBody className="border border-black rounded-sm">
      {cronJobs.map((cj) => (
        <TableRow key={cj.id} className="bg-white hover:bg-zinc-400">
          <TableCell>{formatDateTime(cj.createdAt)}</TableCell>
          <TableCell>{formatDateTime(cj.finishedAt)}</TableCell>

          <TableCell>{cj.jobName}</TableCell>
          <TableCell>{cj.status}</TableCell>
          <TableCell>{cj.message}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}
