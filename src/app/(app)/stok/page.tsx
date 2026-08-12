import { Suspense } from "react";

import { StockView } from "@/components/stock/StockView";

// F-ST T2 · Ekran 3 (Stok & Depo genel katalog) gerçek rotası — [...slug]
// catch-all'ı bu segment için devre dışı bırakır (Next.js App Router: özel
// segment her zaman catch-all'dan önce eşleşir), yani kabuk sidebar'ındaki
// "Stok & Depo" artık ComingSoon'a DÜŞMEZ. `page.test.tsx` + nav href guard
// testi bunu doğrular.
//
// Durum/kategori/arama URL'de taşındığı için görünüm `useSearchParams` kullanır
// ve Suspense sınırında sarılır (Next 15 kanonu; `/belgeler` deseni).
export default function StokPage() {
  return (
    <Suspense>
      <StockView />
    </Suspense>
  );
}
