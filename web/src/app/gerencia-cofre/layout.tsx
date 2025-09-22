"use client";

import { usePathname } from "next/navigation";
import { SideBar } from "@/app/gerencia-cofre/components/side-bar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  const hiddenRoutes = ["/login"];

  const shouldShowLayout = !hiddenRoutes.includes(pathname);
  return (
    <html lang="pt-br">
      <body className={`antialiased w-full h-full`}>
        {shouldShowLayout ? <SideBar>{children}</SideBar> : children}
      </body>
    </html>
  );
}
