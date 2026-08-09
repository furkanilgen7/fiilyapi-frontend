import { Suspense } from "react";

import { ArchiveDocumentsView } from "@/components/documents/ArchiveDocumentsView";

// F-BC T4 · Ekran 12 (genel belge arşivi) gerçek rotası — [...slug] catch-all'ı
// bu segment için devre dışı bırakır (Next.js App Router: özel segment her zaman
// catch-all'dan önce eşleşir), yani kabuk sidebar'ındaki "Belge Arşivi" artık
// ComingSoon'a DÜŞMEZ. `page.test.tsx` bunu doğrular.
//
// Proje/klasör/arama URL'de taşındığı için görünüm `useSearchParams` kullanır
// ve Suspense sınırında sarılır (Next 15 kanonu; `/puantaj` deseni).
export default function BelgelerPage() {
  return (
    <Suspense>
      <ArchiveDocumentsView />
    </Suspense>
  );
}
