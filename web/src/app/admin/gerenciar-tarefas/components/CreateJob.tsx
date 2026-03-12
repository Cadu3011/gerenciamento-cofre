"use client";
import { createJob } from "@/app/actions/jobs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useActionState, useState } from "react";

export default function CreateJob() {
  const [initialState, setinitialState] = useState({ error: "" });
  const [state, formAction, pending] = useActionState(createJob, initialState);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="bg-green-500"
          variant={"secondary"}
          onClick={() => {
            setinitialState({ error: "" });
          }}
        >
          Criar Tarefa
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Crie uma nova tarefa</DialogTitle>
          <DialogDescription>
            O nome da Tarefa deverá ser o mesmo do schedule implementado ao
            sistema
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-2">
          <Input name="name" placeholder="Nome da tarefa" />
          {state?.error && <p className="text-red-700">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
