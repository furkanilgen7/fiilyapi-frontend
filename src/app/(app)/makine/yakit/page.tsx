import { Suspense } from "react";

import { EquipmentFuelView } from "@/components/equipment-fuel/EquipmentFuelView";

// F-MK T5 · M4 (Yakıt Takibi) gerçek rotası — özel segment catch-all'dan önce
// eşleşir (Next.js App Router kanonu), yani `/makine/yakit` artık ComingSoon
// basmaz; `EquipmentTabsStrip`teki bağlantı buraya düşer.
//
// Dönem + ekipman süzgeci URL'de taşındığı için görünüm `useSearchParams`
// kullanır ve Suspense sınırında sarılır (Next 15 kanonu; `/makine/calisma`
// deseni).
export default function MakineYakitPage() {
  return (
    <Suspense>
      <EquipmentFuelView />
    </Suspense>
  );
}
