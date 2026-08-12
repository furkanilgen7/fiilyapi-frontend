"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";

import { PersonnelForm } from "@/components/personnel-form/PersonnelForm";

// F-PT2 T3 · "Personeli Düzenle" rotası — mevcut personel formunun DÜZENLEME
// KİPİ (F-P6 `SectionForm` iki-kip emsali). `useSearchParams` içermeyen
// gövde Suspense'e ihtiyaç duymaz ama `PersonnelForm` `useSearchParams`
// çağırır (create kipiyle paylaşılan bileşen) — sınır burada da kurulur.
export default function EditPersonnelPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense>
      <PersonnelForm mode="edit" personnelId={id} />
    </Suspense>
  );
}
