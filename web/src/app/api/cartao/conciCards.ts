"use server";

import { ItensConciliados } from "@/app/types/conciCards";
import { cookies } from "next/headers";

export async function getGrupoConciliado(grupoId: number) {
  const tokenCookie = (await cookies()).get("access_token")?.value;

  const res = await fetch(
    `http://localhost:4000/conciliacao/conciliados?grupoId=${grupoId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenCookie}`,
      },
    },
  );
  const data: ItensConciliados[] = await res.json();
  return data;
}

export async function desconciliarGrupo(grupoId: number) {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const res = await fetch(`http://localhost:4000/conciliacao/desconciliar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenCookie}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grupoId }),
  });

  return { ok: res.ok, data: await res.json() };
}

export async function getGruposPendentes(date?: string) {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const res = await fetch(
    `http://localhost:4000/conciliacao/divergentes?date=${date}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenCookie}`,
      },
    },
  );
  if (!res.ok) {
    throw new Error("Erro ao buscar pendentes");
  }

  return await res.json();
}

export async function conciliarGrupos(
  groupIds: number[],
  conciliacaoId: number,
  motivo: string,
) {
  const tokenCookie = (await cookies()).get("access_token")?.value;

  const dataBody = {
    groupIds,
    conciliacaoId,
    motivo: motivo.trim() === "" ? null : motivo,
  };

  const res = await fetch(`http://localhost:4000/conciliacao/conciliar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenCookie}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dataBody),
  });
  return { ok: res.ok, data: await res.json() };
}
