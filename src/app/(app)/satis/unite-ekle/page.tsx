import { Suspense } from "react";

import { UnitCreateView } from "@/components/unit-form/UnitCreateView";

// F-UNIT1 T2 · UE ("Form - Unite Ekle.dc.html") gerçek rotası `/satis/unite-ekle`.
// Özel segment catch-all'dan önce eşleşir, yani ComingSoon'a DÜŞMEZ.
//
// 🔴 MODAL DEĞİL, TAM SAYFA: mockup kendi breadcrumb'ını (37), yapışkan üst
// barını (32-44) ve beş sekmelik şeridini (49-55) çizer.
//
// `?proje=` bağlam parametresi `useSearchParams` ile okunduğu için görünüm
// Suspense sınırında sarılır (Next 15 kanonu; `/satis/yeni` deseni).
export default function UniteEklePage() {
  return (
    <Suspense>
      <UnitCreateView />
    </Suspense>
  );
}
