"use server";

export async function handleFormSubmit(formData: FormData) {
  const descrition = formData.get("description") as string;
  const value = formData.get("value") as string;

  const data = {
    descrition,
    value: parseInt(value),
    type: "SANGRIA",
    filialId: 2,
  };
  const dataPost = await fetch("http://localhost:3000/movement", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}
