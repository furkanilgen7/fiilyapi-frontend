import { Suspense } from "react";

import { LandShareAllocationView } from "@/components/land-share-allocation/LandShareAllocationView";

// F-UNIT2 T2c · PG ("Form - Paylasim Girisi.dc.html") gerçek rotası
// `/satis/paylasim-girisi`. Özel segment catch-all'dan önce eşleşir, yani
// ComingSoon'a DÜŞMEZ.
//
// 🔴 MODAL DEĞİL, TAM SAYFA: mockup kendi breadcrumb'ını (36), yapışkan üst
// barını (31-42) ve beş sekmelik şeridini (47-53) çizer; "İptal" (37/275) bir
// `<a href>`, yani GEZİNMEDİR.
//
// `?proje=` bağlam parametresi `useSearchParams` ile okunduğu için görünüm
// Suspense sınırında sarılır (Next 15 kanonu; sarılmazsa `pnpm build`
// prerender aşamasında PATLAR ve görsel kapı bunu "kare oynadı" diye değil
// "build çöktü" diye bildirir — `/satis/toplu-uretim` ve `/satis/blok-ekle`
// deseni).
export default function PaylasimGirisiPage() {
  return (
    <Suspense>
      <LandShareAllocationView />
    </Suspense>
  );
}
