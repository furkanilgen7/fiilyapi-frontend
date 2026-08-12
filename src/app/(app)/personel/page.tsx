import { Suspense } from "react";

import { PersonnelListView } from "@/components/personnel/PersonnelListView";

// F-PT2 T2 · `/personel` liste ekranı — kanon `Personel.dc.html`.
//
// Bu dosyanın eklenmesiyle `/personel` artık [...slug] catch-all'a (ComingSoon)
// DÜŞMEZ; sidebar'daki "Personel" girdisi gerçek bir rotaya gider.
//
// Süzgeçler (`q`/`meslek`/`durum`) URL sorgu parametreleriyle taşındığı için
// görünüm `useSearchParams` kullanır ve Suspense sınırında sarılır (Next 15
// kanonu — `PersonnelCreatePage` ile aynı desen).
export default function PersonnelListPage() {
  return (
    <Suspense>
      <PersonnelListView />
    </Suspense>
  );
}
