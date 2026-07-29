"use client";

import { useParams, usePathname } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { SiteDetailTabs } from "@/components/site-detail/SiteDetailTabs";
import { SiteHeroBar } from "@/components/site-detail/SiteHeroBar";
import { useSite } from "@/lib/api/hooks/useSites";
import { isForbidden } from "@/lib/api/unwrap";
import "@/components/site-detail/site-detail.css";

// Şantiye Detay › Bölümler (spec §5). Bölüm kartları (SectionCard) ve
// SectionFormModal sonraki task'larda eklenir (Task 9/10) — bu ekran hero +
// sekme barı + dürüst boş/dolu bölüm alanını kurar (§7.4), sahte veri basmaz.
export default function SiteDetailPage() {
  const pathname = usePathname();
  const { siteId } = useParams<{ projectId: string; siteId: string }>();
  const siteQuery = useSite(siteId);

  if (isForbidden(siteQuery.error)) return <AccessDenied />;
  if (siteQuery.isError) {
    return <p className="site-detail__message">Şantiye yüklenemedi</p>;
  }
  if (siteQuery.isLoading || !siteQuery.data) {
    return <p className="site-detail__message">Yükleniyor…</p>;
  }

  const site = siteQuery.data;

  return (
    <div className="site-detail">
      <SiteHeroBar site={site} />
      <SiteDetailTabs projectId={site.project.id} siteId={site.id} activePath={pathname} />
      {site.section_count === 0 ? (
        <div className="site-detail__empty">
          <p>Bu şantiyede henüz bölüm tanımlanmadı.</p>
        </div>
      ) : (
        // Bölüm kartları (SectionCard) — Task 9'da eklenecek; sahte veri basılmaz.
        <div className="site-detail__list-slot" data-testid="section-list-slot" />
      )}
    </div>
  );
}
