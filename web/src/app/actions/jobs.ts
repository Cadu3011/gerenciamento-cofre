"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function runCronJob(jobName: string) {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const res = await fetch(`http://localhost:4000/jobs/cron/${jobName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCookie}`,
    },
  });
  const data = await res.json();
  return data;
}

export async function toggleJob(id: number, active: boolean) {
  const tokenCookie = (await cookies()).get("access_token")?.value;

  await fetch(`http://localhost:4000/jobs/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCookie}`,
    },
    body: JSON.stringify({ status: active }),
  });

  revalidatePath("/admin/jobs");
}

export async function createJob(prevState: any, formData: FormData) {
  const jobName = formData.get("name");
  if (!jobName) {
    return { error: "Nome é obrigatório" };
  }
  const tokenCookie = (await cookies()).get("access_token")?.value;

  const res = await fetch(`http://localhost:4000/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCookie}`,
    },
    body: JSON.stringify({ jobName: jobName }),
  });
  const data = await res.json();
  if (data.error) {
    return { error: data.error };
  }
}
