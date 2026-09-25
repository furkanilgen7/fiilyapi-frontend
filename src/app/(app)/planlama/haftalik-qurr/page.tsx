import { Suspense } from "react";

import { GeneralWeeklyQurrView } from "@/components/earned-value/reports/views/GeneralWeeklyQurrView";

// PLN-F3.6a · `/planlama/haftalik-qurr` — Haftalık QURR KÖK İKİZİ; seçili
// şantiye `?site=` ile taşınır (`/planlama/adam-saat-butcesi` deseni) →
// Suspense sınırı.
export default function PlanlamaHaftalikQurrPage() {
  return (
    <Suspense>
      <GeneralWeeklyQurrView />
    </Suspense>
  );
}
