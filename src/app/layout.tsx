import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FİİL Yapı ERP",
  description: "İnşaat ERP yönetim sistemi",
};

/**
 * İlk boyamada kullanılan üç alt küme dosyası (Inter latin + latin-ext,
 * JetBrains Mono latin). Google Fonts'tan `next/font` ile yüklerken bunları kendisi preload ediyordu;
 * yazı tipleri repoya alınınca (F-TB2) o otomatik davranış kalktı, bu yüzden
 * aynı üç bağlantı ELLE korunur — ilk boyama zamanlaması değişmesin diye.
 */
const PRELOADED_FONTS = [
  "558ca1a6aa3cb55e-s.p.woff2",
  "8e9860b6e62d6359-s.p.woff2",
  "e4af272ccee01ff0-s.p.woff2",
] as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <head>
        {PRELOADED_FONTS.map((file) => (
          <link
            key={file}
            rel="preload"
            href={`/fonts/${file}`}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
