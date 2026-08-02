"use client";

import { useParams } from "next/navigation";

import { SectionForm } from "@/components/section-form/SectionForm";

// Bölüm Düzenle rotası (F-P6 T3). Bölüm Detay hero'sundaki "Düzenle" butonu
// (T2, `SectionHeroCard`) buraya link veriyor — rota burada açılıyor.
export default function EditSectionPage() {
  const { projectId, siteId, sectionId } = useParams<{
    projectId: string;
    siteId: string;
    sectionId: string;
  }>();
  return <SectionForm mode="edit" projectId={projectId} siteId={siteId} sectionId={sectionId} />;
}
