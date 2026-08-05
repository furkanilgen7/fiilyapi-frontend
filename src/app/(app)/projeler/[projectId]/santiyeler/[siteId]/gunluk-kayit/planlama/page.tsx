import { Suspense } from "react";

import { SitePlanningView } from "@/components/site-planning/SitePlanningView";

// F-PL T2 · "Planlama" modunun gerçek rotası. Kardeşi `ozet/page.tsx` ile aynı
// desen: sayfa KENDİ LAYOUT'UNU KURMAZ, drill sidebar
// `[projectId]/layout.tsx`ten gelir.
//
// Hafta durumu URL'de taşındığı için görünüm `useSearchParams` kullanır ve
// Suspense sınırında sarılır (Next 15 kanonu, bkz. `hakedisler/yeni/page.tsx`).
export default function SitePlanningPage() {
  return (
    <Suspense>
      <SitePlanningView />
    </Suspense>
  );
}
