import { Suspense } from "react";

import { BlockCreateView } from "@/components/block-form/BlockCreateView";

// F-UNIT1 T2 · BE ("Form - Blok Ekle.dc.html") gerçek rotası `/satis/blok-ekle`.
// Özel segment catch-all'dan önce eşleşir, yani ComingSoon'a DÜŞMEZ.
//
// 🔴 MODAL DEĞİL, TAM SAYFA: mockup kendi breadcrumb'ını (35), yapışkan üst
// barını (30-41) ve beş sekmelik şeridini (47-53) çizer; üçü de bir modalde
// bulunmaz ve "İptal" (38/112) bir `<a href>`, yani GEZİNMEDİR.
//
// `?proje=` bağlam parametresi `useSearchParams` ile okunduğu için görünüm
// Suspense sınırında sarılır (Next 15 kanonu; sarılmazsa `pnpm build`
// prerender aşamasında PATLAR ve görsel kapı bunu "kare oynadı" diye değil
// "build çöktü" diye bildirir — `/satis/yeni` deseni).
export default function BlokEklePage() {
  return (
    <Suspense>
      <BlockCreateView />
    </Suspense>
  );
}
