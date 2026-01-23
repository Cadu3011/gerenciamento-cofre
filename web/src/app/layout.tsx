import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gerenciador Financeiro CPC LTDA",
  description: "Gerenciador Financeiro CPC LTDA",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className}  antialiased`}>
        <div className="flex h-full flex-col divide-y">
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
