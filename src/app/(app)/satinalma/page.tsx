import { Suspense } from "react";

import { PurchaseRequestsView } from "@/components/purchasing/PurchaseRequestsView";

// F-SA T2 · SAT (Satınalma & Teklif) gerçek rotası — [...slug] catch-all'ı bu
// segment için devre dışı bırakır (Next.js App Router: özel segment her zaman
// catch-all'dan önce eşleşir), yani kabuk sidebar'ındaki "Satınalma & Teklif"
// ve drill sidebar'ındaki "Satınalma" artık ComingSoon'a DÜŞMEZ. Nav href
// guard testi (nav-config.test.ts)
// bunu doğrular.
//
// Sekme (durum) + proje + arama URL'de taşındığı için görünüm
// `useSearchParams` kullanır ve Suspense sınırında sarılır (Next 15 kanonu;
// `/stok` deseni).
export default function SatinalmaPage() {
  return (
    <Suspense>
      <PurchaseRequestsView />
    </Suspense>
  );
}
