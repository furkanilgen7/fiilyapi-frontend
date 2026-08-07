import { Suspense } from "react";

import { SiteTimesheetView } from "@/components/timesheet/SiteTimesheetView";

// F-PT T2 · Şantiye "Puantaj" sekmesinin gerçek rotası. Sayfa KENDİ
// LAYOUT'UNU KURMAZ — drill sidebar `[projectId]/layout.tsx`ten gelir
// (`gunluk-kayit`/`is-kalemleri` ile aynı desen).
//
// Dönem + bölüm filtresi URL'de taşındığı için görünüm `useSearchParams`
// kullanır ve Suspense sınırında sarılır (Next 15 kanonu).
export default function SitePuantajPage() {
  return (
    <Suspense>
      <SiteTimesheetView />
    </Suspense>
  );
}
