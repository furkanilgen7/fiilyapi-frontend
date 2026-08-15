import { AccountingView } from "@/components/accounting/AccountingView";

// F-MU1 T2 · MU (Muhasebe · Yevmiye Defteri) gerçek rotası — özel segment
// catch-all'dan önce eşleşir (Next.js App Router kanonu, `/hazine` deseni),
// yani kabuk sidebar'ındaki "Muhasebe" artık ComingSoon'a DÜŞMEZ.
//
// Dönem/hesap süzgeci URL'de TAŞINMAZ (bileşen state'i) — bu yüzden
// `useSearchParams` yoktur ve `Suspense` sarmalayıcısı GEREKMEZ.
export default function MuhasebePage() {
  return <AccountingView />;
}
