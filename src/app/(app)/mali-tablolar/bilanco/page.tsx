import { BalanceSheetView } from "@/components/financial-statements/BalanceSheetView";

// F-MT T2 · BL (Bilanço) gerçek rotası. Drill-in sidebar'ı `BalanceSheetView`
// KENDİSİ basar — rota grubunda BİLEREK `layout.tsx` YOKTUR, çünkü kök
// `/mali-tablolar` ekranı (E11) o sidebar'ı ÇİZMEZ.
//
// Tarih süzgeci URL'de TAŞINMAZ (bileşen state'i) — bu yüzden
// `useSearchParams` yoktur ve `Suspense` sarmalayıcısı GEREKMEZ.
export default function BilancoPage() {
  return <BalanceSheetView />;
}
