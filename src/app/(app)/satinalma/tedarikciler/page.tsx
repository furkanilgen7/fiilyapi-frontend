import { SuppliersView } from "@/components/purchasing/SuppliersView";

// F-SA T2 · TED (Satınalma > Tedarikçiler) gerçek rotası — SAT'ın sekme
// şeridindeki "Tedarikçiler" (mockup 93) buraya düşer.
//
// `/satinalma` sayfasının aksine URL durumu YOKTUR (mockup bu ekranda süzgeç
// çizmez) → `useSearchParams` kullanılmaz, Suspense sınırı GEREKMEZ.
export default function TedarikcilerPage() {
  return <SuppliersView />;
}
