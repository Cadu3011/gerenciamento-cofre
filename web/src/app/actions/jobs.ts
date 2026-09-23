"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function runCronJob(
  jobName: string,
  options?: {
    period?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    force?: boolean;
    bigCharge?: boolean;
  }
) {
  const tokenCookie = (await cookies()).get("access_token")?.value;

  const params = new URLSearchParams();
  if (options?.period) params.set("period", options.period);
  if (options?.date) params.set("date", options.date);
  if (options?.startDate) params.set("startDate", options.startDate);
  if (options?.endDate) params.set("endDate", options.endDate);
  if (options?.force) params.set("force", "true");
  if (options?.bigCharge) params.set("bigCharge", "true");

  const query = params.toString();
  const url = `http://localhost:4000/jobs/cron/${jobName}${
    query ? `?${query}` : ""
  }`;

  const res = await fetch(url, {
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
