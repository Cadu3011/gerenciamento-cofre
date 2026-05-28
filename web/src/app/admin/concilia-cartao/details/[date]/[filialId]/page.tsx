import { apiUrl } from "@/app/api/post";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConciCards } from "@/app/types/conciCards";
import TablesClient from "./components/TablesClient";

export default async function ListDetails({
  params,
}: {
  params: Promise<{ date: string; filialId: string }>;
}) {
  const access_token = (await cookies()).get("access_token")?.value;
  if (!access_token) {
    redirect("/login");
  }
  const Url = await apiUrl();
  const { date, filialId } = await params;
  const res = await fetch(
    `http://${Url}/conciliacao?date=${date}&filialId=${filialId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
  );
  const data: ConciCards = await res.json();
  return (
    <TablesClient
      data={data}
      date={date}
      filialId={Number(filialId)}
      token={access_token}
    />
  );
}
