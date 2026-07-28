"use client";

import { useParams, usePathname } from "next/navigation";

import { DrillSidebar } from "@/components/shell/drill/DrillSidebar";
import { buildProjectNav } from "@/components/shell/drill/project-nav-config";
import { useProject } from "@/lib/api/hooks/useProjects";
import "@/components/project-detail/project-detail.css";

// Proje Detay drill-in kabuğu (spec §2, §3 — Karar 1). SettingsSidebar deseniyle
// birebir: global sidebar altta kalır, DrillSidebar üstüne opak boyanır (260px).
export default function ProjectDetailLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { projectId } = useParams<{ projectId: string }>();
  const projectQuery = useProject(projectId);
  // Proje adı yüklenene kadar geri linki etiketi genel kalır; buildProjectNav
  // her zaman "/projeler"e döner, yalnız üst bağlam grubundaki isim değişir.
  const projectName = projectQuery.data?.name ?? "Proje";
  const nav = buildProjectNav({ projectId, projectName });

  return (
    <>
      <DrillSidebar
        backLabel={nav.backLabel}
        backHref={nav.backHref}
        ariaLabel="Proje gezinme"
        groups={nav.groups}
        activePath={pathname}
      />
      <div className="project-detail-content">{children}</div>
    </>
  );
}
