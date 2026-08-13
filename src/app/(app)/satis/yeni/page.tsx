import { Suspense } from "react";

import { SaleCreateView } from "@/components/sales-form/SaleCreateView";

// F-P8 T3 · DS (Yeni Satış) gerçek rotası `/satis/yeni` (spec K1). Özel segment
// catch-all'dan önce eşleşir, yani ComingSoon'a DÜŞMEZ.
//
// `?proje=` / `?unit=` bağlam parametreleri `useSearchParams` ile okunduğu için
// görünüm Suspense sınırında sarılır (Next 15 kanonu; `/satis` deseni).
export default function YeniSatisPage() {
  return (
    <Suspense>
      <SaleCreateView />
    </Suspense>
  );
}
