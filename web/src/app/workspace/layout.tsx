// app/(app)/layout.tsx
import Header from "@/components/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="flex h-full flex-col divide-y">
        <main className="flex-1  h-full">{children}</main>
      </div>
    </>
  );
}
