import { createJob } from "@/app/actions/jobs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CreateJob() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-green-500" variant={"secondary"}>
          Criar Tarefa
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Crie uma nova tarefa</DialogTitle>
          <DialogDescription>
            O nome da Tarefa deverá ser o mesmo dos schedule implementado ao
            sistema
          </DialogDescription>
        </DialogHeader>
        <form action={createJob} className="flex flex-col gap-2">
          <input
            name="name"
            placeholder="Nome da tarefa"
            className="w-1/2 p-2"
          />
          <Button type="submit">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
