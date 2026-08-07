import { Suspense } from "react";

import { PersonnelCreateView } from "@/components/personnel-form/PersonnelCreateView";

// F-PT T4 · "Yeni Personel Kaydı" tam sayfa formu.
//
// ⚠️ `/personel` (LİSTE) rotası BU DİLİMDE AÇILMAZ: personel listesi ve detayı
// İK dilimine kalır, nav'daki "Personel" girdisi [...slug] catch-all üzerinden
// ComingSoon basmaya DEVAM EDER (bu klasörde `page.tsx` yoktur, yalnız
// `yeni/page.tsx` vardır).
//
// Dönüş rotası (`?donus=`) URL'de taşındığı için görünüm `useSearchParams`
// kullanır ve Suspense sınırında sarılır (Next 15 kanonu).
export default function PersonnelCreatePage() {
  return (
    <Suspense>
      <PersonnelCreateView />
    </Suspense>
  );
}
