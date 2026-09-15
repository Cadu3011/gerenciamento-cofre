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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ListCronJobs from "./ListCronJobs";
import { CronJob } from "@/app/types/jobs";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { CalendarDays, Loader2, Repeat, Zap } from "lucide-react";

function Toggle({
  checked,
  onChange,
  icon,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
        checked
          ? "border-blue-600 bg-blue-50"
          : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
      }`}
    >
      <span className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-md ${
            checked ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-500"
          }`}
        >
          {icon}
        </span>
        <span className="flex flex-col items-start text-left">
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-zinc-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "left-0.5 translate-x-5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function DialogRunCronJob({
  jobName,
  disabled,
}: {
  jobName: string;
  disabled: boolean;
}) {
  const [period, setPeriod] = useState("AUTO");
  const [date, setDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [force, setForce] = useState(false);
  const [bigCharge, setBigCharge] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    ok?: string;
    error?: string;
  } | null>(null);

  const handleRun = async () => {
    if (period === "DATE" && !date) {
      setResult({ error: "Informe a data da execução." });
      return;
    }
    if (period === "RANGE" && (!startDate || !endDate)) {
      setResult({
        error: "Informe as datas de início e fim do período.",
      });
      return;
    }

    setPending(true);
    setResult(null);
    try {
      const r = await runCronJob(jobName, {
        period,
        date: date || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        force: force || undefined,
        bigCharge: bigCharge || undefined,
      });
      setResult(r);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          {disabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {disabled ? "Executando..." : "Executar"}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white w-1/2 max-w-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Executar - {jobName}
          </DialogTitle>
          <DialogDescription>
            Configure os parâmetros da execução antes de disparar a tarefa.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-zinc-700">
              Período
            </label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="AUTO">
                  Automático (continua de onde parou)
                </SelectItem>
                <SelectItem value="DATE">Data específica</SelectItem>
                <SelectItem value="RANGE">
                  Período (data inicial/final)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period === "DATE" && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-700">
                Data
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          {period === "RANGE" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-zinc-700">
                  Data inicial
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-zinc-700">
                  Data final
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <Toggle
              checked={force}
              onChange={setForce}
              icon={<Repeat className="h-5 w-5" />}
              label="Forçar execução"
              hint="Executa mesmo se a tarefa já rodou hoje"
            />
            <Toggle
              checked={bigCharge}
              onChange={setBigCharge}
              icon={<Zap className="h-5 w-5" />}
              label="Big Charge"
              hint="Remove limite de 10 dias e roda em paralelo"
            />
          </div>

          {result?.error && (
            <p className="text-sm font-medium text-red-600">{result.error}</p>
          )}
          {result?.ok && (
            <p className="text-sm font-medium text-green-600">{result.ok}</p>
          )}

          <Button
            className="w-full"
            onClick={handleRun}
            disabled={disabled || pending}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? "Executando..." : "Iniciar execução"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DialogCronJobs({
  jobName,
  cronJobs,
}: {
  jobName: string;
  cronJobs: CronJob[];
}) {
  const loading = cronJobs.length > 0 && cronJobs[0].status === "RUNNING";
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="" variant={"default"}>
          ...
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white w-1/2 max-w-none">
        <DialogHeader>
          <div className="flex justify-between gap-4">
            <div className="flex flex-col">
              <DialogTitle>Lista das ultimas 10 execuções</DialogTitle>
              <DialogDescription>
                Caso a execução foi finalizada a proxima poderá ser executada no
                dia seguinte
              </DialogDescription>
            </div>
            <DialogRunCronJob jobName={jobName} disabled={loading} />
          </div>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Inicio</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Nome da Tarefa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead>Logs</TableHead>
            </TableRow>
          </TableHeader>
          <ListCronJobs cronJobs={cronJobs} />
        </Table>
      </DialogContent>
    </Dialog>
  );
}
