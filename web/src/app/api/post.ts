"use server";

export async function handleFormSubmit(formData: FormData) {
  const descrition = formData.get("description") as string;
  const value = formData.get("value") as string;
  const type = formData.get("type") as string;

  const data = {
    descrition,
    value: parseInt(value),
    type,
    filialId: 3,
  };
  const dataPost = await fetch("http://localhost:3000/movement", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}
