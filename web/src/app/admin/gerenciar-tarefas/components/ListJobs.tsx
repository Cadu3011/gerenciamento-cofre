"use client";

import { toggleJob } from "@/app/actions/jobs";
import { Job } from "@/app/types/jobs";
import { Button } from "@/components/ui/button";
import { TableBody, TableRow, TableCell } from "@/components/ui/table";
import DialogCronJobs from "./DialogCronJobs";

export default function ListJobs({ jobs }: { jobs: Job[] }) {
  return (
    <TableBody className="border border-black rounded-sm">
      {jobs.map((j, index) => (
        <TableRow
          key={j.id}
          className={
            index % 2 === 0
              ? "bg-white hover:bg-zinc-400"
              : "bg-gray-300 hover:bg-zinc-400 "
          }
        >
          <TableCell>{String(j.updatedAt).split("T")[0]}</TableCell>
          <TableCell>{j.jobName}</TableCell>
          <TableCell>{j.status ? "Ativo" : "Inativo"}</TableCell>
          <TableCell className="border-l-2 border-black">
            <div className="flex gap-2 w-1/2">
              <Button onClick={() => toggleJob(j.id, !j.status)}>
                {j.status ? "Desativar" : "Ativar"}
              </Button>
              <DialogCronJobs jobName={j.jobName} cronJobs={j.cronJobs} />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}
