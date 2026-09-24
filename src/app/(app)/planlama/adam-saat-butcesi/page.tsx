import { Suspense } from "react";

import { GeneralManHourBudgetView } from "@/components/earned-value/budget/GeneralManHourBudgetView";

// PLN-F1 · `/planlama/adam-saat-butcesi` — kabuk nav'ının `Planlama ›
// Adam-Saat Bütçesi` öğesi; seçili şantiye `?site=` ile taşınır
// (`/gunluk-kayit` deseni) → Suspense sınırı.
export default function AdamSaatButcesiPage() {
  return (
    <Suspense>
      <GeneralManHourBudgetView />
    </Suspense>
  );
}
