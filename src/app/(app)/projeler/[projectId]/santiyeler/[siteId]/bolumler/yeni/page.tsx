"use client";

import { useParams } from "next/navigation";

import { SectionForm } from "@/components/section-form/SectionForm";

// Yeni Bölüm rotası (F-P6 T3, mockup "Form - Bolum Ekle.dc.html"). Özel
// segment `[...slug]` catch-all'ından her zaman önce eşleşir (Next.js App
// Router). Şantiye Detay'daki "+ Bölüm Ekle" artık `SectionFormModal` yerine
// buraya link verir (SectionFormModal EMEKLİ edildi, bkz. task-3-brief.md).
export default function NewSectionPage() {
  const { projectId, siteId } = useParams<{ projectId: string; siteId: string }>();
  return <SectionForm mode="create" projectKey={projectId} siteKey={siteId} />;
}
