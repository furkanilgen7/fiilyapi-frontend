import { CashFlowStatementView } from "@/components/financial-statements/CashFlowStatementView";

// F-MT T3 · NA (Nakit Akış Tablosu) gerçek rotası. Drill-in sidebar'ı
// `CashFlowStatementView` KENDİSİ basar — rota grubunda BİLEREK `layout.tsx`
// YOKTUR, çünkü kök `/mali-tablolar` ekranı o sidebar'ı ÇİZMEZ.
//
// Dönem süzgeci URL'de TAŞINMAZ (bileşen state'i) — bu yüzden
// `useSearchParams` yoktur ve `Suspense` sarmalayıcısı GEREKMEZ.
export default function NakitAkisiPage() {
  return <CashFlowStatementView />;
}
