"use server";

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
