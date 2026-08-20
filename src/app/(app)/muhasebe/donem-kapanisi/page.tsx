import { PeriodClosingView } from "@/components/accounting/PeriodClosingView";

// F-DKAP T2 · DK (Dönem Kapanışı) gerçek rotası. Drill-in sidebar'ı grubun
// `layout.tsx`i sağlar (`mizan/page.tsx` deseni).
//
// Yıl süzgeci URL'de TAŞINMAZ (bileşen state'i) — bu yüzden `useSearchParams`
// yoktur ve `Suspense` sarmalayıcısı GEREKMEZ.
export default function DonemKapanisiPage() {
  return <PeriodClosingView />;
}
