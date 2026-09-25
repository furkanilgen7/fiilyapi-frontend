import { Suspense } from "react";

import { GeneralPanelView } from "@/components/earned-value/reports/views/GeneralPanelView";

// PLN-F3.6a · `/planlama/panel` — Planlama Paneli KÖK İKİZİ; seçili şantiye
// `?site=` ile taşınır (`/planlama/adam-saat-butcesi` deseni) → Suspense sınırı.
export default function PlanlamaPanelPage() {
  return (
    <Suspense>
      <GeneralPanelView />
    </Suspense>
  );
}
