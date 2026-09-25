import { Suspense } from "react";

import { GeneralDailyReportView } from "@/components/earned-value/reports/views/GeneralDailyReportView";

// PLN-F3.6a · `/planlama/gunluk-rapor` — Günlük İlerleme Raporu KÖK İKİZİ;
// seçili şantiye `?site=` ile taşınır (`/planlama/adam-saat-butcesi` deseni)
// → Suspense sınırı.
export default function PlanlamaGunlukRaporPage() {
  return (
    <Suspense>
      <GeneralDailyReportView />
    </Suspense>
  );
}
