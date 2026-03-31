"use client";
import { runCronJob } from "@/app/actions/jobs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ListCronJobs from "./ListCronJobs";
import { CronJob } from "@/app/types/jobs";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function DialogCronJobs({
  jobName,
  cronJobs,
}: {
  jobName: string;
  cronJobs: CronJob[];
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    ok?: string;
    error?: string;
  } | null>(null);
  useEffect(() => {
    if (cronJobs.length > 0 && cronJobs[0].status === "RUNNING") {
      setLoading(true);
    }
  }, [cronJobs]);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="" variant={"default"}>
          ...
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white w-1/2 max-w-none">
        <DialogHeader>
          <div className="flex justify-between ">
            <DialogTitle>Lista das ultimas 10 execuções</DialogTitle>
            <div className="flex flex-col gap-2">
              <Button
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const result = await runCronJob(jobName);
                    setMessage(result);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="mx-5"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Executando..." : "Executar"}
              </Button>

              {message?.error && (
                <p className="text-sm text-muted-foreground text-red-600">
                  {message.error}
                </p>
              )}
            </div>
          </div>

          <DialogDescription>
            Caso a execução foi finalizada a proxima poderá ser executada no dia
            seguinte
          </DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Inicio</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Nome da Tarefa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mensagem</TableHead>
            </TableRow>
          </TableHeader>
          <ListCronJobs cronJobs={cronJobs} />
        </Table>
      </DialogContent>
    </Dialog>
  );
}
