import { Suspense } from "react";

import { FinancialInstrumentsView } from "@/components/financial-instruments/FinancialInstrumentsView";

// F-FIN · Ekran 10 (Çek & Ödeme) gerçek rotası. Breadcrumb E10:62 "Hazine ·
// Çek & Senet Yönetimi" der → ekran `/hazine` ALTINDA yaşar; özel segment
// catch-all `[...slug]`dan ÖNCE eşleşir (Next.js App Router kanonu).
//
// Sekme seçimi URL'de taşındığı için görünüm `useSearchParams` kullanır ve
// Suspense sınırında sarılır (Next 15 kanonu; `/faturalar` deseni —
// sarmalanmazsa `pnpm build` prerender'da PATLAR ve görsel kapı "kare
// oynadı" DEĞİL "build çöktü" kırmızısı verir).
export default function CekSenetPage() {
  return (
    <Suspense>
      <FinancialInstrumentsView />
    </Suspense>
  );
}
