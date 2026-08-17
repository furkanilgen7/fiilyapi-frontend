import { PayrollSgkView } from "@/components/payroll/PayrollSgkView";

/**
 * F-BOR T4 · `/bordro/sgk` — SGK Bildirimi (mockup `SGK Bildirimi.dc.html`,
 * "SGK"). Sayfa İNCE bir sarmalayıcıdır: SGK:28 sekme şeridinden SGK:91
 * ödenecek prim kutusuna kadar her şey `PayrollSgkView` içinde yaşar
 * (`personel/izinler/page.tsx` kanonu).
 *
 * 🔴 Ekran sorgu parametresi TAŞIMAZ (dönem seçimi bileşen durumudur, URL'ye
 * yazılmaz) ⇒ `useSearchParams` kullanılmaz ve `Suspense` sınırı GEREKMEZ.
 */
export default function BordroSgkPage() {
  return <PayrollSgkView />;
}
