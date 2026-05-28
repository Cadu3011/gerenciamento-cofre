import { getFiliais } from "@/app/api/post";
import SidebarFilter from "./_components/SideBarFilter";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const filiais = await getFiliais();

  return (
    <div className="min-h-screen">
      {/* Sidebar fixa */}
      <aside className="fixed top-0 left-0 z-30 flex h-screen w-14 flex-col items-center bg-blue-950 py-28 sm:w-16">
        <SidebarFilter filiais={filiais} />
      </aside>

      {/* Conteúdo */}
      <main className="ml-14 min-h-screen overflow-auto sm:ml-16">
        {children}
      </main>
    </div>
  );
}
