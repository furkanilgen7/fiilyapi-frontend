import { BankReconciliationView } from "@/components/accounting/BankReconciliationView";

// F-MUP · BM (Banka Mutabakatı) gerçek rotası — KK-10 ile açıldı. Modül
// sekmeleri görünümün İÇİNDEDİR (`AccountingTabs`), grubun `layout.tsx`i
// artık YOKTUR (drill-in sidebar kalktı).
//
// Dönem/hesap süzgeci URL'de TAŞINMAZ (bileşen state'i) — bu yüzden
// `useSearchParams` yoktur ve `Suspense` sarmalayıcısı GEREKMEZ.
export default function BankaMutabakatiPage() {
  return <BankReconciliationView />;
}
