"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { cx } from "@/lib/cx";
import { AccessDenied } from "@/components/settings/AccessDenied";
import { ProjectHeroBar } from "@/components/project-detail/ProjectHeroBar";
import { SiteCard } from "@/components/project-detail/SiteCard";
import { SiteTotalsStrip } from "@/components/project-detail/SiteTotalsStrip";
import { useProject } from "@/lib/api/hooks/useProjects";
import { useSites } from "@/lib/api/hooks/useSites";
import { isForbidden } from "@/lib/api/unwrap";
import "@/components/project-detail/project-detail.css";

// "+ Şantiye Ekle" eylemi hem ust bardaki butonda hem bos durum icinde
// gorunur (spec §7.4); ikisi de AYNI tam sayfa forma gider (§2.3) — modal
// kaldirildi. `project-detail__add-btn` sinifi KORUNUR: gorsel stil degismez.
function AddSiteLink({ projectId, className }: { projectId: string; className?: string }) {
  return (
    <Link
      href={`/projeler/${projectId}/santiyeler/yeni`}
      className={cx("project-detail__add-btn", className)}
    >
      + Şantiye Ekle
    </Link>
  );
}

// Şantiye listesi kendi sorgusuna sahiptir ve proje sorgusundan BAĞIMSIZ
// başarısız olabilir (kod inceleme bulgusu: yalnız `.data` dallanınca 403/500
// sonsuza kadar "Yükleniyor…" gösteriyordu). Şantiye Detay'daki sıralamanın
// aynısı: 403 → erişim reddi, diğer hatalar → dürüst hata metni, yükleniyor.
function SiteListSection({
  projectId,
  sitesQuery,
}: {
  projectId: string;
  sitesQuery: ReturnType<typeof useSites>;
}) {
  if (isForbidden(sitesQuery.error)) return <AccessDenied />;
  if (sitesQuery.isError) {
    return <p className="project-detail__message">Şantiyeler yüklenemedi</p>;
  }
  if (sitesQuery.isLoading || !sitesQuery.data) {
    return <p className="project-detail__message">Yükleniyor…</p>;
  }

  return (
    <div className="project-detail__site-grid" data-testid="site-list-grid">
      {sitesQuery.data.items.map((site) => (
        <SiteCard key={site.id} projectId={projectId} site={site} />
      ))}
    </div>
  );
}

// Proje Detay › Şantiyeler (spec §4). SiteCard ızgarası Task 5'te eklendi;
// SiteTotalsStrip (§4.4) + bos durum eylemi Task 6'da eklendi; santiye ekleme
// modali T11'de KALDIRILDI — iki "+ Şantiye Ekle" de tam sayfa forma gider.
export default function ProjectDetailPage() {
  const pathname = usePathname();
  const { projectId } = useParams<{ projectId: string }>();
  const projectQuery = useProject(projectId);
  const sitesQuery = useSites(projectId);

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
        <AddSiteLink projectId={projectId} />
      </div>
      {project.site_count === 0 ? (
        <div className="project-detail__empty">
          <p>Bu projede henüz şantiye yok.</p>
          <AddSiteLink projectId={projectId} className="project-detail__empty-action" />
        </div>
      ) : (
        <SiteListSection projectId={projectId} sitesQuery={sitesQuery} />
      )}
      {sitesQuery.data && <SiteTotalsStrip totals={sitesQuery.data.totals} />}
    </div>
  );
}
