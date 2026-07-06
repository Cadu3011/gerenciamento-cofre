"use client";

import { toggleJob } from "@/app/actions/jobs";
import { Job } from "@/app/types/jobs";
import { Button } from "@/components/ui/button";
import { TableBody, TableRow, TableCell } from "@/components/ui/table";
import DialogCronJobs from "./DialogCronJobs";
import { CircleCheck, CircleX, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { formatDate } from "../../dashboard/utils";
export default function ListJobs({ jobs }: { jobs: Job[] }) {
  const [jobsState, setJobsState] = useState(jobs);
  const handleJobStatus = (updatedJob: Job) => {
    setJobsState((old) =>
      old.map((job) => (job.id === updatedJob.id ? updatedJob : job)),
    );
  };
  useEffect(() => {
    setJobsState(jobs);
  }, [jobs]);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on("job-status", handleJobStatus);

    return () => {
      socket.off("job-status", handleJobStatus);
    };
  }, []);

  // useEffect(() => {
  //   const handleJobStatus = (data: { jobName: string; status: string }) => {
  //     console.log(data);

  //     setJobsState((old) =>
  //       old.map((job) =>
  //         job.jobName === data.jobName
  //           ? {
  //               ...job,
  //               cronJobs: [
  //                 {
  //                   ...job.cronJobs[0],
  //                   status: data.status,
  //                 },
  //               ],
  //             }
  //           : job,
  //       ),
  //     );
  //   };

  //   socket.on("job-status", handleJobStatus);

  //   return () => {
  //     socket.off("job-status", handleJobStatus);
  //   };
  // }, []);

  return (
    <TableBody className="border border-black rounded-sm">
      {jobsState.map((j, index) => (
        <TableRow
          key={j.id}
          className={
            index % 2 === 0
              ? "bg-white hover:bg-zinc-400"
              : "bg-gray-300 hover:bg-zinc-400 "
          }
        >
          <TableCell>
            {formatDate(String(j.cronJobs[0].finishedAt).split("T")[0])}
          </TableCell>
          <TableCell>{j.jobName}</TableCell>
          <TableCell>
            {j.cronJobs.length > 0 && (
              <>
                {j.cronJobs[0].status === "SUCCESS" && (
                  <CircleCheck color="#1aff29" />
                )}

                {j.cronJobs[0].status === "FAILED" && (
                  <CircleX color="#fa0000" />
                )}

                {j.cronJobs[0].status === "RUNNING" && (
                  <Loader className="animate-spin text-yellow-500" />
                )}
              </>
            )}
          </TableCell>

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
