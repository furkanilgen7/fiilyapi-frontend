import { VatReturnView } from "@/components/accounting/VatReturnView";

// F-MU2 T3 · KDV (KDV Beyannamesi) gerçek rotası. Drill-in sidebar'ı grubun
// `layout.tsx`i sağlar (`mizan/page.tsx` deseni).
//
// Dönem süzgeci URL'de TAŞINMAZ (bileşen state'i) — `useSearchParams` yoktur,
// `Suspense` sarmalayıcısı GEREKMEZ.
export default function KdvBeyaniPage() {
  return <VatReturnView />;
}
