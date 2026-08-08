import { Suspense } from "react";

import { GeneralTimesheetView } from "@/components/timesheet/GeneralTimesheetView";

// F-PT T2 · Ekran 5 (genel puantaj) gerçek rotası — [...slug] catch-all'ı bu
// segment için devre dışı bırakır (Next.js App Router: özel segment her zaman
// catch-all'dan önce eşleşir), yani nav'daki "Puantaj" artık ComingSoon'a
// DÜŞMEZ. `page.test.tsx` bunu doğrular.
//
// Dönem + şantiye URL'de taşındığı için görünüm `useSearchParams` kullanır ve
// Suspense sınırında sarılır (Next 15 kanonu; `gunluk-kayit/planlama` deseni).
export default function PuantajPage() {
  return (
    <Suspense>
      <GeneralTimesheetView />
    </Suspense>
  );
}
