"use client";

import { useState } from "react";
import { useParams, usePathname } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { SectionCard } from "@/components/site-detail/SectionCard";
import { SectionFormModal } from "@/components/site-detail/SectionFormModal";
import { SiteDetailTabs } from "@/components/site-detail/SiteDetailTabs";
import { SiteHeroBar } from "@/components/site-detail/SiteHeroBar";
import { useSite } from "@/lib/api/hooks/useSites";
import { isForbidden } from "@/lib/api/unwrap";
import "@/components/site-detail/site-detail.css";

// Bos durumdaki "+ Bölüm Ekle" eylemi — SiteHeroBar'daki ust bar butonuyla ayni
// modali acar (Task 10).
function AddSectionButton({ className, onClick }: { className?: string; onClick: () => void }) {
  return (
    <button type="button" className={className} onClick={onClick}>
      + Bölüm Ekle
    </button>
  );
}

// "A-Blok Bölümleri (5)" — site adının sonundaki " Şantiyesi" ekini kırpar
// (mockup deseni, spec §5.4 satır 211).
function sectionListTitle(siteName: string, count: number): string {
  return `${siteName.replace(/ Şantiyesi$/, "")} Bölümleri (${count})`;
}

// Şantiye Detay › Bölümler (spec §5). Hero + sekme barı Task 8'de kuruldu;
// Task 9 SectionCard listesini ve dürüst boş durumu (§7.4) ekledi; Task 10
// "+ Bölüm Ekle" eylemlerini SectionFormModal'e bağlar.
export default function SiteDetailPage() {
  const pathname = usePathname();
  const { siteId } = useParams<{ projectId: string; siteId: string }>();
  const siteQuery = useSite(siteId);
  const [isSectionModalOpen, setSectionModalOpen] = useState(false);

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
      <SiteHeroBar site={site} onAddSection={() => setSectionModalOpen(true)} />
      <SiteDetailTabs projectId={site.project.id} siteId={site.id} activePath={pathname} />
      {site.section_count === 0 ? (
        <div className="site-detail__empty">
          <p>Bu şantiyede henüz bölüm tanımlanmadı.</p>
          <AddSectionButton
            className="site-detail__empty-action"
            onClick={() => setSectionModalOpen(true)}
          />
        </div>
      ) : (
        <>
          <div className="site-detail__section-title">{sectionListTitle(site.name, site.section_count)}</div>
          <ul className="section-card-list" data-testid="section-list">
            {site.sections.map((section) => (
              <li key={section.id}>
                <SectionCard projectId={site.project.id} siteId={site.id} section={section} />
              </li>
            ))}
          </ul>
        </>
      )}
      {isSectionModalOpen && (
        <SectionFormModal siteId={site.id} onClose={() => setSectionModalOpen(false)} />
      )}
    </div>
  );
}
