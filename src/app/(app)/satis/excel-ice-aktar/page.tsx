import { Suspense } from "react";

import { UnitImportView } from "@/components/unit-import/UnitImportView";

// F-UNIT2 T2b · EI ("Form - Unite Excel Import.dc.html") gerçek rotası
// `/satis/excel-ice-aktar`. Özel segment catch-all'dan önce eşleşir, yani
// ComingSoon'a DÜŞMEZ.
//
// 🔴 MODAL DEĞİL, TAM SAYFA: mockup kendi breadcrumb'ını (36), yapışkan üst
// barını (31-42) ve beş sekmelik şeridini (47-53) çizer; "İptal" (200) bir
// `<a href>`, yani GEZİNMEDİR.
//
// `?proje=` bağlam parametresi `useSearchParams` ile okunduğu için görünüm
// Suspense sınırında sarılır (Next 15 kanonu; sarılmazsa `pnpm build`
// prerender aşamasında PATLAR ve görsel kapı bunu "kare oynadı" diye değil
// "build çöktü" diye bildirir — `/satis/toplu-uretim` ve `/satis/blok-ekle`
// deseni).
export default function ExcelIceAktarPage() {
  return (
    <Suspense>
      <UnitImportView />
    </Suspense>
  );
}
