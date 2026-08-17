"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { isForbidden } from "@/lib/api/unwrap";

import { ProjectCard } from "./ProjectCard";
import { ProjectTabs } from "./ProjectTabs";
import { TypeLegend } from "./TypeLegend";
import { parseProjectTab, tabToFilter, type ProjectTab } from "./tabs";
import "./projects.css";

/**
 * Proje Takvimi (Gantt) rotası — bekçiye kayıtlı olabilmesi için DIŞA AKTARILIR
 * (`projects-routes.test.ts`). Elle yazılmış bir kopya bayatlar.
 */
export const PROJECT_TIMELINE_HREF = "/projeler/takvim";

export function ProjectsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseProjectTab(searchParams.get("tab"));

  const projectsQuery = useProjects(tabToFilter(tab));

  function handleTabChange(next: ProjectTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (isForbidden(projectsQuery.error)) return <AccessDenied />;
  if (projectsQuery.isError) return <p className="prj-message">Projeler yüklenemedi</p>;
  if (projectsQuery.isLoading || !projectsQuery.data) {
    return <p className="prj-message">Yükleniyor…</p>;
  }

  const { counts, items } = projectsQuery.data;
  // Backend ayri "active" sayaci vermiyor; tamamlanmamis her sey portfoydedir (spec §4.1).
  const activeCount = counts.all - counts.completed;

  return (
    <div className="prj">
      <p className="prj__breadcrumb">Portföy · {activeCount} Aktif Proje</p>
      <div className="prj__title-row">
        <h1 className="prj__title">Projeler</h1>
        <div className="prj__title-actions">
          {/* F-TKV K1 — Proje Takvimi'nin TEK giriş noktası. Sidebar'a satır
              EKLENMEZ (bir nav satırı 44 görsel kareyi birden oynatır); bağlantı
              `projects-routes.test.ts` bekçisine KAYITLIDIR. */}
          <Link href={PROJECT_TIMELINE_HREF} className="prj__timeline-btn">
            Proje Takvimi
          </Link>
          <Link href="/projeler/yeni" className="prj__new-btn">
            + Yeni Proje
          </Link>
        </div>
      </div>
      <TypeLegend counts={counts} />
      <ProjectTabs active={tab} counts={counts} onChange={handleTabChange} />
      {items.length === 0 ? (
        <section className="prj-empty">
          <p className="prj-empty__title">
            {tab === "all" ? "Henüz proje tanımlanmadı" : "Bu sekmede proje yok"}
          </p>
          <p className="prj-empty__hint">
            {tab === "all" ? "+ Yeni Proje ile başlayın" : "Başka bir sekme seçin"}
          </p>
        </section>
      ) : (
        <div className="prj-grid">
          {items.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
