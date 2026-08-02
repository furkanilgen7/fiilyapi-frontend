import { Suspense } from "react";

import { NewProgressPaymentContent } from "./NewProgressPaymentContent";

// P7 T5 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır. `useSearchParams` kullanan istemci bileşen Suspense sınırında
// sarılır (Next 15 kanonu, bkz. `projeler/page.tsx`).
export default function NewProgressPaymentPage() {
  return (
    <Suspense>
      <NewProgressPaymentContent />
    </Suspense>
  );
}
