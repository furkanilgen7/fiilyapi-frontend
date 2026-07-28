"use client";

import { useParams, usePathname } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { ProjectHeroBar } from "@/components/project-detail/ProjectHeroBar";
import { useProject } from "@/lib/api/hooks/useProjects";
import { isForbidden } from "@/lib/api/unwrap";
import "@/components/project-detail/project-detail.css";

// Proje Detay › Şantiyeler (spec §4). Şantiye kartları (SiteCard/SiteTotalsStrip/
// SiteFormModal) sonraki task'larda eklenir — bu ekran hero + başlık + buton + boş alan kurar.
export default function ProjectDetailPage() {
  const pathname = usePathname();
  const { projectId } = useParams<{ projectId: string }>();
  const projectQuery = useProject(projectId);

  if (isForbidden(projectQuery.error)) return <AccessDenied />;
  if (projectQuery.isError) {
    return <p className="project-detail__message">Proje yüklenemedi</p>;
  }
  if (projectQuery.isLoading || !projectQuery.data) {
    return <p className="project-detail__message">Yükleniyor…</p>;
  }

  const project = projectQuery.data;

  return (
    <div className="project-detail">
      <ProjectHeroBar project={project} activePath={pathname} />
      <div className="project-detail__section-head">
        <h2 className="project-detail__section-title">Şantiyeler ({project.site_count})</h2>
        <button type="button" className="project-detail__add-btn">
          + Şantiye Ekle
        </button>
      </div>
      {project.site_count === 0 ? (
        <div className="project-detail__empty">
          <p>Bu projede henüz şantiye yok.</p>
        </div>
      ) : (
        // Şantiye kartı ızgarası (SiteCard) — Task 5'te eklenecek; sahte veri basılmaz.
        <div className="project-detail__list-slot" data-testid="site-list-slot" />
      )}
    </div>
  );
}
