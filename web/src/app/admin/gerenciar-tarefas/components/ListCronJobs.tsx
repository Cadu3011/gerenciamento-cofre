import { CronJob } from "@/app/types/jobs";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";

export default function ListCronJobs({ cronJobs }: { cronJobs: CronJob[] }) {
  if (cronJobs.length === 0) {
    return null;
  }
  return (
    <TableBody className="border border-black rounded-sm">
      {cronJobs.map((cj) => (
        <TableRow key={cj.id} className="bg-white hover:bg-zinc-400">
          <TableCell>{String(cj.runDate).split("T")[0]}</TableCell>
          <TableCell>{cj.jobName}</TableCell>
          <TableCell>{cj.status}</TableCell>
          <TableCell>{cj.message}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}
