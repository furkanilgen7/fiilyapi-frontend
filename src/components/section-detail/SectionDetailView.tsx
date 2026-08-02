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
import { SectionHeroCard } from "./SectionHeroCard";
import "./section-detail.css";

// Sekmeler (D99-105) — bölüm seviyesinde rota YOK (kabul edilmiş sapma,
// task-2-brief §Rota: drill sidebar'a bölüm eklenmez). Bu yüzden
// `SiteDetailTabs`teki gibi Link tabanlı değil, YEREL state ile geçiş yapar.
// İçerikleri onaylı spec §3 kararı gereği HEPSİ pending-modules kartıdır
// (BOQ-bölüm bağı kalıcı karar 1 gereği kapalı) — mockup'taki poz tablosu
// SAHTE VERİYLE basılmaz.
const TABS: { label: string; pendingModule: string }[] = [
  { label: "İş Kalemleri", pendingModule: "boq" },
  { label: "İşçiler & Puantaj", pendingModule: "timesheet" },
  { label: "Malzeme", pendingModule: "stock" },
  { label: "Hakediş", pendingModule: "progress_payments" },
  { label: "Günlük Kayıt", pendingModule: "site_diary" },
];

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

      <div className="section-tabs" role="tablist" aria-label="Bölüm detay sekmeleri">
        {TABS.map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={activeTab === index}
            className={activeTab === index ? "section-tabs__tab section-tabs__tab--active" : "section-tabs__tab"}
            onClick={() => setActiveTab(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="section-panel" role="tabpanel">
        <div className="section-panel__body">
          <CardEmptyState
            title={`${TABS[activeTab].label} — bu bölümde henüz görüntülenemiyor`}
            pendingModule={TABS[activeTab].pendingModule}
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
            {/* D218: "Puantaj →" — bölüm seviyesinde rota yok, site seviyesi
                "puantaj" sekmesine gider (SiteDetailTabs'taki gibi henüz
                yazılmamış — catch-all ComingSoon'a düşer, ölü link değildir). */}
            <Link
              href={`/projeler/${projectId}/santiyeler/${siteId}/puantaj`}
              title="Bu bölüm yakında"
              className="section-side-card__link"
            >
              Puantaj →
            </Link>
          </div>
          <CardEmptyState title="Puantaj verisi bu bölümde henüz görüntülenemiyor" pendingModule="timesheet" />
        </div>

        {/* D253-272: "Bölüm Malzeme Durumu" */}
        <div className="section-side-card">
          <div className="section-side-card__head">
            <span>Bölüm Malzeme Durumu</span>
            {/* D256: "Tümü →" — aynı gerekçe, site seviyesi "stok" sekmesine gider. */}
            <Link
              href={`/projeler/${projectId}/santiyeler/${siteId}/stok`}
              title="Bu bölüm yakında"
              className="section-side-card__link"
            >
              Tümü →
            </Link>
          </div>
          <CardEmptyState title="Malzeme durumu bu bölümde henüz görüntülenemiyor" pendingModule="stock" />
        </div>
      </div>
    </div>
  );
}
