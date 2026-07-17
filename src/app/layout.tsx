import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FİİL Yapı ERP",
  description: "İnşaat ERP yönetim sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
