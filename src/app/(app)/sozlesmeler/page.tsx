import { Suspense } from "react";

import { ContractsView } from "@/components/contracts/ContractsView";

// F-P5 T2 · gerçek rota — `[...slug]` catch-all'ı bu segment için devre dışı
// bırakır (özel segment her zaman catch-all'dan önce eşleşir), yani
// `/sozlesmeler` artık ComingSoon DEĞİL. `useSearchParams` kullanan istemci
// bileşen Suspense sınırında sarılır (Next 15 kanonu, bkz.
// `hakedisler/taseron/page.tsx`).
export default function SozlesmelerPage() {
  return (
    <Suspense>
      <ContractsView />
    </Suspense>
  );
}
