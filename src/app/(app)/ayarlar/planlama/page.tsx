import { Suspense } from "react";

import { PlanningSettingsScreen } from "@/components/earned-value/settings/PlanningSettingsScreen";

// PLN-F1 · `/ayarlar/planlama` gerçek rotası. Şantiye sayfanın kendi seçicisiyle
// `?site=` üzerinden seçilir (K1, Ayarlar - Planlama (Ek).dc.html M7) →
// `useSearchParams` için Suspense sınırı (Next 15 kanonu, `/puantaj` deseni).
export default function PlanlamaAyarlariPage() {
  return (
    <Suspense>
      <PlanningSettingsScreen />
    </Suspense>
  );
}
