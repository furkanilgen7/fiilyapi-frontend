"use client";

import { useState } from "react";
import { useParams, usePathname } from "next/navigation";

import { cx } from "@/lib/cx";
import { AccessDenied } from "@/components/settings/AccessDenied";
import { ProjectHeroBar } from "@/components/project-detail/ProjectHeroBar";
import { SiteCard } from "@/components/project-detail/SiteCard";
import { SiteFormModal } from "@/components/project-detail/SiteFormModal";
import { SiteTotalsStrip } from "@/components/project-detail/SiteTotalsStrip";
import { useProject } from "@/lib/api/hooks/useProjects";
import { useSites } from "@/lib/api/hooks/useSites";
import { isForbidden } from "@/lib/api/unwrap";
import "@/components/project-detail/project-detail.css";

// "+ Şantiye Ekle" eylemi hem ust bardaki butonda hem bos durum icinde
// gorunur (spec §7.4); ikisi de ayni ac/kapa durumunu (onClick) paylasir —
// SiteFormModal Task 7'de bu iki butona baglandi.
function AddSiteButton({ className, onClick }: { className?: string; onClick: () => void }) {
  return (
    <button type="button" className={cx("project-detail__add-btn", className)} onClick={onClick}>
      + Şantiye Ekle
    </button>
  );
}

// Proje Detay › Şantiyeler (spec §4). SiteCard ızgarası Task 5'te eklendi;
// SiteTotalsStrip (§4.4) + bos durum eylemi Task 6'da eklendi; SiteFormModal
// Task 7'de eklendi (§7.4 — iki "+ Şantiye Ekle" butonu da ayni modali acar).
export default function ProjectDetailPage() {
  const pathname = usePathname();
  const { projectId } = useParams<{ projectId: string }>();
  const projectQuery = useProject(projectId);
  const sitesQuery = useSites(projectId);
  const [isSiteFormOpen, setIsSiteFormOpen] = useState(false);

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
        <AddSiteButton onClick={() => setIsSiteFormOpen(true)} />
      </div>
      {project.site_count === 0 ? (
        <div className="project-detail__empty">
          <p>Bu projede henüz şantiye yok.</p>
          <AddSiteButton
            className="project-detail__empty-action"
            onClick={() => setIsSiteFormOpen(true)}
          />
        </div>
      ) : sitesQuery.data ? (
        <div className="project-detail__site-grid" data-testid="site-list-grid">
          {sitesQuery.data.items.map((site) => (
            <SiteCard key={site.id} projectId={projectId} site={site} />
          ))}
        </div>
      ) : (
        <p className="project-detail__message">Yükleniyor…</p>
      )}
      {sitesQuery.data && <SiteTotalsStrip totals={sitesQuery.data.totals} />}
      {isSiteFormOpen && (
        <SiteFormModal projectId={projectId} onClose={() => setIsSiteFormOpen(false)} />
      )}
    </div>
  );
}
