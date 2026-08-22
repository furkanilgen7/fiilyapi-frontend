import { Suspense } from "react";

import { EquipmentRentalInvoicesView } from "@/components/equipment-rental/EquipmentRentalInvoicesView";

// F-KIRA · `/makine/kira` — kira hakedişi listesi. `EquipmentTabsStrip`teki
// "Kira Hakedişi" sekmesi buraya iner (T4'te devre-dışıdan canlıya geçti).
//
// `Suspense` ZORUNLU: görünüm `useSearchParams` kullanıyor ve Next 15 App
// Router'da o hook `Suspense` sınırı olmadan derlemeyi kırar
// (`makine/calisma/page.tsx` ile aynı kanon).
export default function EquipmentRentalInvoicesPage() {
  return (
    <Suspense>
      <EquipmentRentalInvoicesView />
    </Suspense>
  );
}
