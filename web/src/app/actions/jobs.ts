"use server";

import { revalidatePath } from "next/cache";

export async function toggleJob(id: number, active: boolean) {
  await fetch(`http://localhost:4000/jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });

  revalidatePath("/admin/jobs");
}

export async function createJob(formData: FormData) {
  const jobName = formData.get("name");
  await fetch(`http://localhost:4000/jobs`, {
    method: "POST",
    body: JSON.stringify({ name: jobName }),
  });
}
