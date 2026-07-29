"use client";

import { useParams, usePathname } from "next/navigation";

import { DrillSidebar } from "@/components/shell/drill/DrillSidebar";
import { buildProjectNav } from "@/components/shell/drill/project-nav-config";
import { useProject } from "@/lib/api/hooks/useProjects";
import { useSite } from "@/lib/api/hooks/useSites";
import "@/components/site-detail/site-detail.css";

// Şantiye Detay drill-in kabuğu (spec §5.1, §3 — Karar 1). Proje Detay
// layout'uyla birebir aynı desen: global sidebar altta kalır, DrillSidebar
// üstüne opak boyanır (260px). Geri linki BİR seviye yukarı (Proje Detay)
// gider; etiket PROJENİN ADIDIR — sabit metin değil (spec §3.1, task-8 brief).
export default function SiteDetailLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { projectId, siteId } = useParams<{ projectId: string; siteId: string }>();
  const projectQuery = useProject(projectId);
  const siteQuery = useSite(siteId);
  const projectName = projectQuery.data?.name ?? "Proje";
  const siteName = siteQuery.data?.name ?? "Şantiye";
  const nav = buildProjectNav({ projectId, projectName, siteId, siteName });

  return (
    <>
      <DrillSidebar
        backLabel={nav.backLabel}
        backHref={nav.backHref}
        ariaLabel="Şantiye gezinme"
        groups={nav.groups}
        activePath={pathname}
      />
      <div className="site-detail-content">{children}</div>
    </>
  );
}
