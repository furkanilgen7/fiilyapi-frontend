import { Suspense } from "react";

import { NewSubcontractorProgressPaymentContent } from "./NewSubcontractorProgressPaymentContent";

// F-TH T3 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır. `useSearchParams` kullanan istemci bileşen Suspense sınırında
// sarılır (Next 15 kanonu, bkz. `hakedisler/yeni/page.tsx`).
export default function NewSubcontractorProgressPaymentPage() {
  return (
    <Suspense>
      <NewSubcontractorProgressPaymentContent />
    </Suspense>
  );
}
