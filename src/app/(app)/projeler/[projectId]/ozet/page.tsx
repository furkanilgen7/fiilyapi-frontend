"use client";

import { useParams, usePathname } from "next/navigation";

import { ProjectSummaryView } from "@/components/project-summary/ProjectSummaryView";

// F-PKK T2 · Proje Özeti (`Proje - Kendi Yatırım` / `Proje - Kat Karşılığı`).
// Sayfa yalnız rota parametresini çözer; ekranın kendisi bileşendedir —
// `ProjectDetailPage` deseni.
export default function ProjectSummaryPage() {
  const pathname = usePathname();
  // URL-3 — rota parametresi artik "slug VEYA UUID"dur; cozumleme gorunumde.
  const { projectId: projectKey } = useParams<{ projectId: string }>();
  return <ProjectSummaryView projectKey={projectKey} activePath={pathname} />;
}
