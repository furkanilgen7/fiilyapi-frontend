import { TrialBalanceView } from "@/components/accounting/TrialBalanceView";

// F-MU2 T2 · MZ (Mizan) gerçek rotası. Drill-in sidebar'ı grubun `layout.tsx`i
// sağlar (`hesap-plani/page.tsx` deseni).
//
// Dönem süzgeci URL'de TAŞINMAZ (bileşen state'i) — bu yüzden
// `useSearchParams` yoktur ve `Suspense` sarmalayıcısı GEREKMEZ.
export default function MizanPage() {
  return <TrialBalanceView />;
}
