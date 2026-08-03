import { Suspense } from "react";

import { SubcontractorProgressPaymentsView } from "@/components/progress-payments/SubcontractorProgressPaymentsView";

// F-TH T2 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır. `useSearchParams` kullanan istemci bileşen Suspense sınırında
// sarılır (Next 15 kanonu, bkz. `projeler/page.tsx` / `hakedisler/yeni/page.tsx`).
export default function TaseronHakedisPage() {
  return (
    <Suspense>
      <SubcontractorProgressPaymentsView />
    </Suspense>
  );
}
