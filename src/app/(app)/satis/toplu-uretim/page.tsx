import { Suspense } from "react";

import { BulkUnitCreateView } from "@/components/bulk-unit-form/BulkUnitCreateView";

// F-UNIT2 T2a · TU ("Form - Toplu Unite.dc.html") gerçek rotası
// `/satis/toplu-uretim`. Özel segment catch-all'dan önce eşleşir, yani
// ComingSoon'a DÜŞMEZ.
//
// 🔴 MODAL DEĞİL, TAM SAYFA: mockup kendi breadcrumb'ını (36), yapışkan üst
// barını (31-42) ve beş sekmelik şeridini (47-53) çizer; "İptal" (39/181) bir
// `<a href>`, yani GEZİNMEDİR.
//
// `?proje=` bağlam parametresi `useSearchParams` ile okunduğu için görünüm
// Suspense sınırında sarılır (Next 15 kanonu; sarılmazsa `pnpm build`
// prerender aşamasında PATLAR ve görsel kapı bunu "kare oynadı" diye değil
// "build çöktü" diye bildirir — `/satis/yeni` ve `/satis/blok-ekle` deseni).
export default function TopluUretimPage() {
  return (
    <Suspense>
      <BulkUnitCreateView />
    </Suspense>
  );
}
