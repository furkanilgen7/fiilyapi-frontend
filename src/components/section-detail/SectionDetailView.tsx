"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { CardEmptyState } from "@/components/dashboard/CardEmptyState";
import { useSection } from "@/lib/api/hooks/useSection";
import { useSite } from "@/lib/api/hooks/useSites";
import { isForbidden } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { SECTION_TABS, SectionDetailTabs } from "./SectionDetailTabs";
import { SectionHeroCard } from "./SectionHeroCard";
import "./section-detail.css";

// Sekme şeridi ve `SECTION_TABS` tanımı `SectionDetailTabs.tsx`tedir (F-BOLLINK
// ayırması — bekçi testinin hook mock'u olmadan render edebilmesi için).
// İçerikler onaylı spec §3 kararı gereği HEPSİ pending kartıdır (BOQ-bölüm bağı
// kalıcı karar 1 gereği kapalı) — mockup'taki poz tablosu SAHTE VERİYLE basılmaz.

// D218 / D256 — alt satır kartlarının "→" bağlantıları. Bölüm seviyesinde rota
// yok; ikisi de ŞANTİYE seviyesindeki GERÇEK ekrana gider (her iki rota da
// yazılı: `SiteDetailTabs` `written: true`).
//
// 🔴 `carriesSection` ÖLÇÜLDÜ, varsayılmadı (F-BOLLINK):
//   - `puantaj` → `SiteTimesheetView` `searchParams.get("section")` OKUR
//     (`SiteTimesheetView.tsx`, `sectionParam`) → bölüm süzgeci taşınır.
//   - `stok` → `SiteStockView` HİÇ `useSearchParams` kullanmaz → parametre
//     eklemek ÖLÜ query yazmak olurdu, EKLENMEZ.
// Görünür gerekçe (`title`) bağlantının kendi tanımından TÜRETİLİR — eski
// "Bu bölüm yakında" metni BAYATTI: rotalar yazılmışken "yakında" diyordu.
const SIDE_LINKS = {
  timesheet: {
    slug: "puantaj",
    label: "Puantaj →",
    carriesSection: true,
    title: "Şantiye puantajını bu bölümün süzgeciyle açar",
  },
  stock: {
    slug: "stok",
    label: "Tümü →",
    carriesSection: false,
    title: "Şantiye genelindeki stok ekranını açar (bölüm süzgeci henüz yok)",
  },
} as const;

// Bölüm Detay ekranı (F-P6 T2, mockup Bölüm Detay.dc.html). Hero + sekmeler +
// iki alt kart — hepsi tek container'da orkestre edilir (`site-detail` desenin
// aksine burada tüm içerik pending olduğu için ayrı bir "boş durum" dalı yok).
export function SectionDetailView() {
  const { projectId, siteId, sectionId } = useParams<{
    projectId: string;
    siteId: string;
    sectionId: string;
  }>();
  const sectionQuery = useSection(sectionId);
  const siteQuery = useSite(siteId);
  // İzin: ekran `sites:view`, "Düzenle" butonu `sites:full` (task-2-brief §İzin).
  const { canView, canWrite } = useModulePermission("sites");
  const [activeTab, setActiveTab] = useState(0);

  if (!canView || isForbidden(sectionQuery.error) || isForbidden(siteQuery.error)) {
    return <AccessDenied />;
  }
  if (sectionQuery.isError) {
    return <p className="section-detail__message">Bölüm yüklenemedi</p>;
  }
  if (sectionQuery.isLoading || !sectionQuery.data) {
    return <p className="section-detail__message">Yükleniyor…</p>;
  }

  /** Alt kart bağlantısının hedefi; süzgeci OKUYAN ekranda `?section=` taşınır. */
  function sideLinkHref(link: (typeof SIDE_LINKS)[keyof typeof SIDE_LINKS]): string {
    const href = `/projeler/${projectId}/santiyeler/${siteId}/${link.slug}`;
    return link.carriesSection ? `${href}?section=${encodeURIComponent(sectionId)}` : href;
  }

  const section = sectionQuery.data;
  const siteName = siteQuery.data?.name ?? "";
  const workerIsReal =
    section.worker_count.available &&
    section.worker_count.count !== null &&
    section.worker_count.count !== undefined;

  return (
    <div className="section-detail">
      <SectionHeroCard
        section={section}
        siteName={siteName}
        projectId={projectId}
        siteId={siteId}
        canEdit={canWrite}
      />

      <SectionDetailTabs
        projectId={projectId}
        siteId={siteId}
        activeIndex={activeTab}
        onSelect={setActiveTab}
      />

      <div className="section-panel" role="tabpanel">
        <div className="section-panel__body">
          <CardEmptyState
            title={`${SECTION_TABS[activeTab].label} — bu bölümde henüz görüntülenemiyor`}
            pendingModule={SECTION_TABS[activeTab].contentPending}
          />
        </div>
      </div>

      <div className="section-detail__bottom-row">
        {/* D215-250: "Bu Bölümdeki İşçiler" — sahte satırlar basılmaz, başlıktaki
            sayı yalnız GERÇEK olduğunda basılır (worker_count bu dilimde
            yer tutucu — sahte "(48)" YAZILMAZ). */}
        <div className="section-side-card">
          <div className="section-side-card__head">
            <span>Bu Bölümdeki İşçiler{workerIsReal ? ` (${section.worker_count.count})` : ""}</span>
            {/* D218: "Puantaj →" — YAZILMIŞ rotaya gider ve bölüm süzgecini TAŞIR. */}
            <Link
              href={sideLinkHref(SIDE_LINKS.timesheet)}
              title={SIDE_LINKS.timesheet.title}
              className="section-side-card__link"
            >
              {SIDE_LINKS.timesheet.label}
            </Link>
          </div>
          <CardEmptyState
            title="Puantaj verisi bu bölümde henüz görüntülenemiyor"
            pendingModule="section_timesheet"
          />
        </div>

        {/* D253-272: "Bölüm Malzeme Durumu" */}
        <div className="section-side-card">
          <div className="section-side-card__head">
            <span>Bölüm Malzeme Durumu</span>
            {/* D256: "Tümü →" — YAZILMIŞ stok rotasına gider; bölüm süzgeci
                hedef ekranda OKUNMADIĞI için query EKLENMEZ (ölü parametre). */}
            <Link
              href={sideLinkHref(SIDE_LINKS.stock)}
              title={SIDE_LINKS.stock.title}
              className="section-side-card__link"
            >
              {SIDE_LINKS.stock.label}
            </Link>
          </div>
          <CardEmptyState
            title="Malzeme durumu bu bölümde henüz görüntülenemiyor"
            pendingModule="section_stock"
          />
        </div>
      </div>
    </div>
  );
}
