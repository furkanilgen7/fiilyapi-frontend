import { Suspense } from "react";

import { InvoicesView } from "@/components/invoices/InvoicesView";

// F-FAT2 T2 · FY (Fatura Yönetimi) gerçek rotası — özel segment catch-all'dan
// önce eşleşir (Next.js App Router kanonu, `/hazine` deseni), yani kabuk
// sidebar'ındaki "Fatura Yönetimi" artık ComingSoon'a DÜŞMEZ.
//
// Sekme/süzgeç/arama URL'de taşındığı için görünüm `useSearchParams` kullanır
// ve Suspense sınırında sarılır (Next 15 kanonu; `/satinalma/siparisler`
// deseni — sarmalanmazsa `pnpm build` prerender'da PATLAR).
export default function FaturalarPage() {
  return (
    <Suspense>
      <InvoicesView />
    </Suspense>
  );
}
