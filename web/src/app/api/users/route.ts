import { cookies } from "next/headers";
import { apiUrl } from "../post";
const Url = await apiUrl();
export async function PATCH(req: Request) {
  const { filialId } = await req.json();
  const token = (await cookies()).get("access_token")?.value;
  const data = { filialId: Number(filialId) };
  const res = await fetch(`http://${Url}/users`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
    cache: "no-store",
  });

  const datas = await res.json();
  return Response.json(datas);
}
