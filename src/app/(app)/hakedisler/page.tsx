import { Suspense } from "react";

import { ProgressPaymentsView } from "@/components/progress-payments/ProgressPaymentsView";

// P7 T2 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır (Next.js App Router: özel segment her zaman catch-all'dan önce
// eşleşir). `page.test.tsx` bu sayfanın ComingSoon DEĞİL gerçek görünümü
// bastığını doğrular.
//
// F-PRJTAB T3: görünüm artık `useSearchParams` okuyor (proje süzgeci URL'de
// yaşar) — Next 15 kanonu gereği Suspense sınırında sarılır
// (`hakedisler/taseron/page.tsx` ile aynı).
export default function HakedislerPage() {
  return (
    <Suspense>
      <ProgressPaymentsView />
    </Suspense>
  );
}
