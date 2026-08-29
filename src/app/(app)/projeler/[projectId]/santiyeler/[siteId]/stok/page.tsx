import { Suspense } from "react";

import { SiteStockView } from "@/components/stock/SiteStockView";

// F-ST T3 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır (Next.js App Router: özel segment her zaman catch-all'dan önce
// eşleşir), yani "Stok" sekmesi artık ComingSoon'a DÜŞMEZ. Sayfa KENDİ
// LAYOUT'UNU KURMAZ; drill sidebar `[projectId]/layout.tsx`ten gelir
// (belgeler/gunluk-kayit/puantaj deseni).
// 🔴 STOK-BOLUM — `Suspense` EKLENDİ. Görünüm artık `?section=` süzgecini
// `useSearchParams` ile okuyor; Next 15'te bu hook Suspense sınırı GEREKTİRİR
// (sarılmazsa sayfa build'de prerender hatası verir — `/stok` ve `/belgeler`
// aynı sınırı taşır).
export default function SiteStockPage() {
  return (
    <Suspense>
      <SiteStockView />
    </Suspense>
  );
}
