import { Suspense } from "react";

import { PurchaseOrdersView } from "@/components/purchasing/PurchaseOrdersView";

// F-SA T4 · SIP (Satınalma > Siparişler) gerçek rotası — sekme şeridindeki
// "Siparişler" (SIP 28) buraya düşer.
//
// Durum süzgeci URL'de taşındığı için görünüm `useSearchParams` kullanır ve
// Suspense sınırında sarılır (Next 15 kanonu; `/satinalma` deseni).
export default function SiparislerPage() {
  return (
    <Suspense>
      <PurchaseOrdersView />
    </Suspense>
  );
}
