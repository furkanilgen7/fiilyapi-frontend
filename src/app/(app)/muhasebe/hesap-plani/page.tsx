import { ChartOfAccountsView } from "@/components/accounting/ChartOfAccountsView";

// F-MU1 T3 · HP (Hesap Planı) gerçek rotası. Drill-in sidebar'ı grubun
// `layout.tsx`i sağlar.
//
// Arama URL'de TAŞINMAZ (bileşen state'i) — bu yüzden `useSearchParams` yoktur
// ve `Suspense` sarmalayıcısı GEREKMEZ (T2'nin `/muhasebe` deseni).
export default function HesapPlaniPage() {
  return <ChartOfAccountsView />;
}
