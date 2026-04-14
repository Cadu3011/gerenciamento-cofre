import { apiUrl } from "@/app/api/post";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConciCards } from "@/app/types/conciCards";
import TablesClient from "../components/TablesClient";

export default async function ListDetails({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const access_token = (await cookies()).get("access_token")?.value;
  if (!access_token) {
    redirect("/login");
  }
  const Url = await apiUrl();
  const { date } = await params;

  const res = await fetch(`http://${Url}/conciliacao?date=${date}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  const data: ConciCards = await res.json();
  return <TablesClient data={data} date={date} token={access_token} />;
}
