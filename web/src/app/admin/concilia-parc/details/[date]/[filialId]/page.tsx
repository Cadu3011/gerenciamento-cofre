import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TablesClient from "./components/TablesClient";
import { getParcelasByDate } from "@/app/api/conciliacao-parc";

export default async function DetailParc({
  params,
  searchParams,
}: {
  params: Promise<{ date: string; filialId: string }>;
  searchParams: Promise<{
    status?: string;
    bandeiras?: string;
    divergencias?: string;
    page?: string;
  }>;
}) {
  const access_token = (await cookies()).get("access_token")?.value;
  if (!access_token) {
    redirect("/login");
  }

  const { date, filialId } = await params;
  const sp = await searchParams;
  const statuses = sp.status?.split(",").filter(Boolean) ?? [];
  const bandeiras = sp.bandeiras?.split(",").filter(Boolean) ?? [];
  const divergencias = sp.divergencias?.split(",").filter(Boolean) ?? [];
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 100;

  const result = await getParcelasByDate(
    date,
    Number(filialId),
    { status: statuses, bandeiras, divergencias },
    page,
    pageSize,
  );

  return (
    <TablesClient
      data={result.items}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      totais={result.totais}
      date={date}
      filialId={Number(filialId)}
      statuses={statuses}
      bandeiras={bandeiras}
      divergencias={divergencias}
    />
  );
}