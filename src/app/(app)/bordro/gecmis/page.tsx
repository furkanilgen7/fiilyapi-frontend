import { PayrollHistoryView } from "@/components/payroll/PayrollHistoryView";

/**
 * F-BOR T3 · `/bordro/gecmis` — Bordro Geçmişi (mockup `Bordro Geçmişi.dc.html`,
 * "BG"). Sayfa İNCE bir sarmalayıcıdır: BG:27 sekme şeridinden BG:116 tfoot'una
 * kadar her şey `PayrollHistoryView` içinde yaşar
 * (`personel/izinler/page.tsx` kanonu).
 *
 * 🔴 Ekran sorgu parametresi TAŞIMAZ (yıl süzgeci bileşen durumudur, URL'ye
 * yazılmaz) ⇒ `useSearchParams` kullanılmaz ve `Suspense` sınırı GEREKMEZ.
 */
export default function BordroGecmisPage() {
  return <PayrollHistoryView />;
}
