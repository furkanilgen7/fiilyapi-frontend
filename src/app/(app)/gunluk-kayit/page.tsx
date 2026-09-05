import { Suspense } from "react";

import { GeneralSiteDiaryView } from "@/components/site-diary/GeneralSiteDiaryView";

// F-NAVSAHA · `/gunluk-kayit` gerçek rotası — [...slug] catch-all'ı bu segment
// için devre dışı bırakır (Next.js App Router: özel segment her zaman
// catch-all'dan önce eşleşir), yani kabuk sidebar'ındaki `Saha › Günlük Kayıt`
// ComingSoon'a DÜŞMEZ. `page.test.tsx` + nav href guard testi bunu doğrular.
//
// Seçili şantiye URL'de taşındığı için görünüm `useSearchParams` kullanır ve
// Suspense sınırında sarılır (Next 15 kanonu; `/puantaj` deseni).
export default function GunlukKayitPage() {
  return (
    <Suspense>
      <GeneralSiteDiaryView />
    </Suspense>
  );
}
