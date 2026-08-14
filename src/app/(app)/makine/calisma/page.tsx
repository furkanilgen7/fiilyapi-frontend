import { Suspense } from "react";

import { EquipmentWorkView } from "@/components/equipment-work/EquipmentWorkView";

// F-MK T4 · M3 (Çalışma Kaydı) gerçek rotası — özel segment catch-all'dan
// önce eşleşir (Next.js App Router kanonu), yani `/makine/calisma` artık
// ComingSoon basmaz; `EquipmentTabsStrip`teki bağlantı buraya düşer.
//
// Dönem + şantiye URL'de taşındığı için görünüm `useSearchParams` kullanır ve
// Suspense sınırında sarılır (Next 15 kanonu; `/puantaj` deseni).
export default function MakineCalismaPage() {
  return (
    <Suspense>
      <EquipmentWorkView />
    </Suspense>
  );
}
