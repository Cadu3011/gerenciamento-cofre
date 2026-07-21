import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TablesClient from "./components/TablesClient";
import { getParcelasByDate } from "@/app/api/conciliacao-parc";

export default async function DetailParc({
  params,
}: {
  params: Promise<{ date: string; filialId: string }>;
}) {
  const access_token = (await cookies()).get("access_token")?.value;
  if (!access_token) {
    redirect("/login");
  }

  const { date, filialId } = await params;
  const data = await getParcelasByDate(date, Number(filialId));

  return (
    <TablesClient
      data={data}
      date={date}
      filialId={Number(filialId)}
    />
  );
}
