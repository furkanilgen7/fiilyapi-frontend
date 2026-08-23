"use client";

import { useParams, usePathname } from "next/navigation";

import { ProjectSummaryView } from "@/components/project-summary/ProjectSummaryView";

// F-PKK T2 · Proje Özeti (`Proje - Kendi Yatırım` / `Proje - Kat Karşılığı`).
// Sayfa yalnız rota parametresini çözer; ekranın kendisi bileşendedir —
// `ProjectDetailPage` deseni.
export default function ProjectSummaryPage() {
  const pathname = usePathname();
  const { projectId } = useParams<{ projectId: string }>();
  return <ProjectSummaryView projectId={projectId} activePath={pathname} />;
}
