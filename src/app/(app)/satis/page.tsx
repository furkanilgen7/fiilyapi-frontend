import { Suspense } from "react";

import { SalesView } from "@/components/sales/SalesView";

// F-P8 T2 · SY (Satış Yönetimi) gerçek rotası — [...slug] catch-all'ı bu
// segment için devre dışı bırakır (Next.js App Router: özel segment her zaman
// catch-all'dan önce eşleşir), yani nav'daki "Satış Yönetimi" artık
// ComingSoon'a DÜŞMEZ. Nav href guard testleri bunu doğrular.
//
// Seçili proje + durum süzgeci URL'de taşındığı için görünüm
// `useSearchParams` kullanır ve Suspense sınırında sarılır (Next 15 kanonu;
// `/stok` deseni).
export default function SatisPage() {
  return (
    <Suspense>
      <SalesView />
    </Suspense>
  );
}
