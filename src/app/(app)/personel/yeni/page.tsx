import { Suspense } from "react";

import { PersonnelForm } from "@/components/personnel-form/PersonnelForm";

// F-PT T4 · "Yeni Personel Kaydı" tam sayfa formu — `PersonnelForm`ın
// `create` kipi (F-PT2 T3'te düzenleme kipiyle aynı bileşene taşındı, bkz.
// `PersonnelForm.tsx`).
//
// Dönüş rotası (`?donus=`) URL'de taşındığı için görünüm `useSearchParams`
// kullanır ve Suspense sınırında sarılır (Next 15 kanonu).
export default function PersonnelCreatePage() {
  return (
    <Suspense>
      <PersonnelForm mode="create" />
    </Suspense>
  );
}
