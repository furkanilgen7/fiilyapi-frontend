import { PayrollMonthlyView } from "@/components/payroll/PayrollMonthlyView";

/**
 * F-BOR T2 · `/bordro` — Aylık Bordro ekranı (mockup `Bordro Yönetimi.dc.html`,
 * "BY"). Sayfa İNCE bir sarmalayıcıdır: BY:46 breadcrumb'ından BY:330 ödeme
 * kutularına kadar her şey `PayrollMonthlyView` içinde yaşar
 * (`personel/izinler/page.tsx` kanonu).
 *
 * 🔴 K1 — BU DOSYA GERÇEK BİR `page.tsx` OLMAK ZORUNDADIR. Kardeş ekranlar
 * (`/bordro/gecmis`, `/bordro/sgk`) yazılınca `bordro` KLASÖRÜ doğar ve kök
 * yol `[...slug]` catch-all'ının kapsamından ÇIKAR: kök `/bordro` gerçek bir
 * sayfa olmazsa `not-found`a (gerçek 404) düşer. `nav-config.ts:72` zaten
 * `{ label: "Bordro", href: "/bordro" }` bağlantısını çiziyor — sidebar'daki
 * o link doğrudan buraya gelir.
 *
 * 🔴 Ekran sorgu parametresi TAŞIMAZ (ay gezgini ve tip sekmesi bileşen
 * durumudur, URL'ye yazılmaz) ⇒ `useSearchParams` kullanılmaz ve `Suspense`
 * sınırı GEREKMEZ (mali tablolar kanonu).
 */
export default function BordroPage() {
  return <PayrollMonthlyView />;
}
