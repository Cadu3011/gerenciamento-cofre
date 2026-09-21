"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export interface Filial {
  id: number;
  name: string;
  idCofreTrier: number | null;
  idBancoDefault: number | null;
  idBancoRecebimentos: number | null;
  idCielo: string | null;
  idRede: string | null;
  urlLocalTrier: string | null;
  tokenTrier: string | null;
}

export type FilialInput = Partial<
  Omit<Filial, "id">
>;

export async function listFiliais(): Promise<Filial[]> {
  const tokenCookie = (await cookies()).get("access_token")?.value;

  const res = await fetch(`http://localhost:4000/filial`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCookie}`,
    },
  });

  return res.json();
}

export async function createFilial(data: FilialInput) {
  const tokenCookie = (await cookies()).get("access_token")?.value;

  const res = await fetch(`http://localhost:4000/filial`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCookie}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.message ?? "Erro ao criar filial" };
  }

  revalidatePath("/admin/gerencia-filial");
  return res.json();
}

export async function updateFilial(id: number, data: FilialInput) {
  const tokenCookie = (await cookies()).get("access_token")?.value;

  const res = await fetch(`http://localhost:4000/filial/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCookie}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.message ?? "Erro ao atualizar filial" };
  }

  revalidatePath("/admin/gerencia-filial");
  return res.json();
}