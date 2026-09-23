import { Suspense } from "react";

import { SiteDocumentsView } from "@/components/documents/SiteDocumentsView";

// F-BC T2 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır (Next.js App Router: özel segment her zaman catch-all'dan önce
// eşleşir). Sayfa KENDİ LAYOUT'UNU KURMAZ, drill sidebar
// `[projectId]/layout.tsx`'ten gelir (gunluk-kayit/puantaj deseni).
//
// 🔴 Kayıt 69/387 — `Suspense` EKLENDİ. `SiteDocumentsView` `useSearchParams`
// çağırır (`SiteDocumentsView.tsx:58`); Next 15'te bu hook Suspense sınırı
// GEREKTİRİR (sarılmazsa sayfa build'de prerender hatası verir — kardeş
// rotalar `/stok`/`/puantaj`/kök `/belgeler` aynı sınırı taşır, bu sayfa
// unutulmuştu).
export default function SiteDocumentsPage() {
  return (
    <Suspense>
      <SiteDocumentsView />
    </Suspense>
  );
}
