"use client";

import { usePathname } from "next/navigation";
import "./globals.css";
import { SideBar } from "@/components/side-bar";

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
      <body className={`antialiased`}>
        {shouldShowLayout ? <SideBar>{children}</SideBar> : children}
      </body>
    </html>
  );
}
