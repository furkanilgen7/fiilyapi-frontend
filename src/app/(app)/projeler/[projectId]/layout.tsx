"use client";

import { useParams, usePathname } from "next/navigation";

import { DrillSidebar } from "@/components/shell/drill/DrillSidebar";
import { buildProjectNav } from "@/components/shell/drill/project-nav-config";
import { useProject } from "@/lib/api/hooks/useProjects";
import { useSite } from "@/lib/api/hooks/useSites";
import "@/components/project-detail/project-detail.css";
import "@/components/site-detail/site-detail.css";

// Proje/Şantiye drill-in kabuğu (spec §2, §3, §5.1 — Karar 1). SettingsSidebar
// deseniyle birebir: global sidebar altta kalır, DrillSidebar üstüne opak
// boyanır (260px).
//
// Kabuğun SAHİBİ TEK SEVİYEDİR (kod inceleme bulgusu). Şantiye Detay rotası
// kendi layout'unu kurmaz: App Router layout'ları iç içe geçtiği için iki
// DrillSidebar birden render ediliyor (ikisi de position:fixed olduğundan
// ekranda tek görünüyor ama İKİSİ DE DOM'da, Tab sırasında ve ekran okuyucu
// yer imlerinde kalıyordu) ve içerik ofseti iki kez uygulanıyordu.
// siteId burada route parametresinden okunur — varsa şantiye seviyesindeyiz.
export default function ProjectDetailLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { projectId, siteId } = useParams<{ projectId: string; siteId?: string }>();
  const projectQuery = useProject(projectId);
  // Şantiye seviyesinde değilsek sorgu hiç çalışmaz (useSite `enabled`).
  const siteQuery = useSite(siteId ?? "");
  // Proje adı yüklenene kadar geri linki etiketi genel kalır; buildProjectNav
  // her zaman bir seviye yukarı döner, yalnız üst bağlam grubundaki isim değişir.
  const projectName = projectQuery.data?.name ?? "Proje";
  const siteName = siteQuery.data?.name ?? "Şantiye";
  const nav = siteId
    ? buildProjectNav({ projectId, projectName, siteId, siteName })
    : buildProjectNav({ projectId, projectName });

  return (
    <>
      <DrillSidebar
        backLabel={nav.backLabel}
        backHref={nav.backHref}
        ariaLabel={siteId ? "Şantiye gezinme" : "Proje gezinme"}
        groups={nav.groups}
        activePath={pathname}
      />
      <div className="drill-content">{children}</div>
    </>
  );
}
