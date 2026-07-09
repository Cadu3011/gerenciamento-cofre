"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function DialogLogsCronJobs({
  jobName,
  logs,
}: {
  jobName: string;
  logs: {
    metrics: {
      files: number;
      inserted: number;
      extracted: number;
      warnings: number;
      errors: number;
      retries: number;
    };
    logs: {
      step: string;
      level: string;
      message: string;
      timestamp: string;
      durationMs: number;
    }[];
    durationMs: number;
    startedAt: string;
    finishedAt: string;
  };
}) {
  const formatDateTime = (date: Date | string) => {
    const parsedDate = new Date(date);

    const formattedDate = parsedDate.toLocaleDateString("pt-BR");
    const formattedTime = parsedDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${formattedDate} ${formattedTime}`;
  };
  if (!logs) return;
  function formatDuration(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (ms < 1000) {
      return `${ms / 1000} ms`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="" variant={"default"}>
          ...
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] bg-white">
        <DialogHeader className="space-y-5 rounded-lg border bg-zinc-50 p-5">
          <DialogTitle className="text-2xl font-bold">
            Logs - {jobName}
          </DialogTitle>

          <div className="flex flex-wrap gap-8">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Início</span>
              <span className="rounded-md bg-white px-3 py-2 shadow-sm border">
                {formatDateTime(logs.startedAt)}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Fim</span>
              <span className="rounded-md bg-white px-3 py-2 shadow-sm border">
                {logs.finishedAt === undefined
                  ? ""
                  : formatDateTime(logs.finishedAt)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Tempo</span>
              <span className="rounded-md bg-white px-3 py-2 shadow-sm border">
                {formatDuration(logs.durationMs)}
              </span>
            </div>
            <div className="flex flex-col w-16 text-center">
              <span className="text-xs text-muted-foreground">Alertas</span>
              <span className="rounded-md bg-yellow-300 px-3 py-2 shadow-sm border">
                {logs.metrics.warnings ?? 0}
              </span>
            </div>
            <div className="flex flex-col  w-16 text-center">
              <span className="text-xs text-muted-foreground">Erros</span>
              <span className="rounded-md bg-red-300 px-3 py-2 shadow-sm border">
                {logs.metrics.errors ?? 0}
              </span>
            </div>
            <div className="flex flex-col  w-16 text-center">
              <span className="text-xs text-muted-foreground">
                Retentativas
              </span>
              <span className="rounded-md bg-blue-300 px-3 py-2 shadow-sm border">
                {logs.metrics.retries ?? 0}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border bg-blue-50 p-4">
              <p className="text-sm text-zinc-500">Extraídos</p>
              <p className="text-3xl font-bold text-blue-700">
                {logs.metrics.extracted}
              </p>
            </div>

            <div className="rounded-lg border bg-green-50 p-4">
              <p className="text-sm text-zinc-500">Inseridos</p>
              <p className="text-3xl font-bold text-green-700">
                {logs.metrics.inserted}
              </p>
            </div>

            <div className="rounded-lg border bg-orange-50 p-4">
              <p className="text-sm text-zinc-500">Arquivos</p>
              <p className="text-3xl font-bold text-orange-700">
                {logs.metrics.files}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-zinc-100">
              <TableRow>
                <TableHead className="font-semibold">Passo</TableHead>
                <TableHead className="font-semibold">Nível</TableHead>
                <TableHead className="font-semibold">Mensagem</TableHead>
                <TableHead className="font-semibold">Tempo</TableHead>
                <TableHead className="font-semibold">Horário</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {logs.logs.map((l, index) => (
                <TableRow
                  key={index}
                  className="transition-colors hover:bg-zinc-100"
                >
                  <TableCell className="font-medium">{l.step}</TableCell>

                  <TableCell>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold
                  ${
                    l.level === "ERROR"
                      ? "bg-red-100 text-red-700"
                      : l.level === "WARN"
                        ? "bg-yellow-100 text-yellow-700"
                        : l.level === "INFO"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-zinc-200 text-zinc-700"
                  }`}
                    >
                      {l.level}
                    </span>
                  </TableCell>

                  <TableCell className="max-w-lg break-words">
                    {l.message}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {l.durationMs && formatDuration(l.durationMs)}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {formatDateTime(l.timestamp)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
