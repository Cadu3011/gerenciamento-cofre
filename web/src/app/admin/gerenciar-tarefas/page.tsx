"use server";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ListJobs from "./components/ListJobs";
import { cookies } from "next/headers";
import CreateJob from "./components/CreateJob";

async function getJobs() {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const res = await fetch("http://localhost:4000/jobs", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${tokenCookie}`,
    },
  });

  return res.json();
}

export default async function GerenciarTarefas() {
  const jobs = await getJobs();

  return (
    <div className="px-5">
      <div className="bg-blue-950 flex justify-between py-2 px-20">
        <div className="p-3 bg-white rounded-md">
          <h1 className="font-bold">Gerenciar Tarefas</h1>
        </div>

        <CreateJob />
      </div>

      <Table>
        <TableHeader className="bg-blue-950 sticky top-0 z-10">
          <TableRow className="sticky top-0 z-10">
            <TableHead className="text-white text-lg">
              Ultima atualização
            </TableHead>
            <TableHead className="text-white text-lg">Tarefa</TableHead>
            <TableHead className="text-white text-lg">Status</TableHead>
            <TableHead className="text-white text-lg w-20">Ações</TableHead>
          </TableRow>
        </TableHeader>
        {jobs ? (
          <ListJobs jobs={jobs} />
        ) : (
          <div className="text-center">Sem tarefas para exibir</div>
        )}
      </Table>
    </div>
  );
}
