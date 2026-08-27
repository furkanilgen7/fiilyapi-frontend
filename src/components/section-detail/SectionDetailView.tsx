"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { CardEmptyState } from "@/components/dashboard/CardEmptyState";
import { currentPeriod } from "@/components/timesheet/month";
import { useTimesheetData } from "@/components/timesheet/useTimesheetData";
import { useBoq } from "@/lib/api/hooks/useBoq";
import { useSection } from "@/lib/api/hooks/useSection";
import { useSite } from "@/lib/api/hooks/useSites";
import { useSiteDiaryEntries } from "@/lib/api/hooks/useSiteDiary";
import { useSiteSubcontractorPayments } from "@/lib/api/hooks/useSiteSubcontractorPayments";
import { isForbidden } from "@/lib/api/unwrap";
import { formatPeriod } from "@/lib/format";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { groupSectionWorkers } from "./section-workers";
import { SectionBoqCard } from "./SectionBoqCard";
import { SectionDiaryPanel } from "./SectionDiaryPanel";
import { SectionPaymentsPanel } from "./SectionPaymentsPanel";
import { SectionStockPanel } from "./SectionStockPanel";
import { SectionTimesheetPanel } from "./SectionTimesheetPanel";
import { SectionWorkersList } from "./SectionWorkersList";
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
  // BOQ-SEC-F: bölüm süzgeçli BOQ. Hook koşullu ÇAĞRILAMAZ, bu yüzden sekme
  // seçili olmasa da bağlanır; `enabled` kapısı `siteId`dedir. Süzgeç sorgu
  // ANAHTARINDADIR — şantiye BOQ ekranının önbelleğini EZMEZ.
  const sectionBoq = useBoq(siteId, sectionId);
  // F-BLMPUAN — bölüm süzgeçli puantaj. TEK çağrı: sekme paneli ve alt kart
  // AYNI türev kümesini paylaşır (ikinci bir ağ isteği/türev turu oluşmaz).
  //
  // 🔴 K2 KORUNUR: `useTimesheetData` `section_id`yi AĞA GÖNDERMEZ, süzgeci
  // yalnız GÖRÜNÜME uygular. Sunucu süzgeci (üçüncü argüman) BİLEREK
  // KULLANILMADI — o yol satır kümesini de süzer ve bu ekranı "Puantaj →"
  // bağlantısının açtığı `?section=` görünümünden FARKLI kılardı; ayrıca
  // `derive.ts`in tüm türevleri (adam-gün, `4+`, `3G`) yeniden yazılırdı.
  // Önbellek de şantiye ekranıyla PAYLAŞILIR (aynı `queryKey`).
  //
  // Dönem: ay gezinmesi YOKTUR (mockup bu sekme için hiçbir denetim çizmez) —
  // içinde bulunulan ay, `SiteTimesheetView` ile AYNI kaynaktan (`month.ts`).
  // İkinci bir varsayılan yazılmaz.
  const period = currentPeriod();
  const timesheet = useTimesheetData({ siteId, period, sectionId });
  // F-BLMSEK — bölüm süzgeçli günlük kayıt. Hook koşullu ÇAĞRILAMAZ (yukarıdaki
  // BOQ notunun aynısı), bu yüzden sekme seçili olmasa da bağlanır.
  //
  // 🔴 SÜZGEÇSİZ çağrılır — hem `section_id` sorgu parametresi liste ucunda
  // YOK (verilse SESSİZCE yok sayılır, `section-diary.ts` başına bakınız), hem
  // de dönem süzgeci VERİLMEZ: böylece sorgu anahtarı şantiye günlüğü ekranıyla
  // AYNI kalır (`["site-diary-entries", siteId, null, null, null, null]`) ve
  // önbellek paylaşılır. Süzgeç yalnız GÖRÜNÜME uygulanır.
  const diaryEntries = useSiteDiaryEntries(siteId);
  // F-BLMSEK T2 — bölüm süzgeçli TAŞERON hakedişi. Hook koşullu ÇAĞRILAMAZ
  // (yukarıdaki BOQ notunun aynısı), bu yüzden sekme seçili olmasa da bağlanır.
  //
  // 🔴 Bölüm parametresi YOK ve EKLENMEZ: liste ucu `section_id` KABUL ETMEZ
  // (ölçüldü — `project_id`/`site_id`/`period_*`/`status`/`q`/`limit`/`offset`).
  // Süzgeç yalnız GÖRÜNÜME uygulanır (`section-payments.ts`); imza değişmediği
  // için önbellek şantiye "Hakedişler" ekranıyla PAYLAŞILIR, ikinci istek yok.
  const subcontractorPayments = useSiteSubcontractorPayments(projectId, siteId);
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
  const activeTabDef = SECTION_TABS[activeTab];
  const periodLabel = formatPeriod(period.year, period.month);
  // D219-246 — gruplama SUNUM kararıdır (bkz. `section-workers.ts`).
  const workerGroups = groupSectionWorkers(timesheet.view.rows);
  const workerIsReal =
    section.worker_count.available &&
    section.worker_count.count !== null &&
    section.worker_count.count !== undefined;

  /**
   * CANLI sekmelerin gövde dağıtımı. `siteSlug` üzerinden AYRIK dallar —
   * F-BLMSEK'te üçüncü canlı sekme gelince iç içe üçlü koşul okunamaz hâle
   * gelirdi. Dalların BASTIĞI DOM değişmedi (iki sekmenin görsel tabanı var):
   * eski `<>…</>` parçası da DOM üretmiyordu.
   */
  function livePanel() {
    switch (activeTabDef.siteSlug) {
      case "puantaj":
        return (
          <SectionTimesheetPanel
            sectionName={section.name}
            periodLabel={periodLabel}
            view={timesheet.view}
            isLoading={timesheet.isLoading}
            isError={timesheet.isError}
          />
        );
      case "gunluk-kayit":
        return (
          <SectionDiaryPanel
            sectionId={sectionId}
            sectionName={section.name}
            sections={siteQuery.data?.sections ?? []}
            items={diaryEntries.data?.items ?? []}
            isLoading={diaryEntries.isLoading}
            isError={diaryEntries.isError}
            diaryHref={`/projeler/${projectId}/santiyeler/${siteId}/gunluk-kayit`}
          />
        );
      case "hakedisler":
        return (
          <SectionPaymentsPanel
            sectionId={sectionId}
            sectionName={section.name}
            items={subcontractorPayments.items}
            isLoading={subcontractorPayments.isLoading}
            isError={subcontractorPayments.isError}
            isPartial={subcontractorPayments.isPartial}
            truncation={subcontractorPayments.truncation}
            paymentsHref={`/projeler/${projectId}/santiyeler/${siteId}/hakedisler`}
          />
        );
      case "stok":
        // 🔴 F-BLMSEK T3 — TEK kalan pending sekme. Diğer üçünün aksine bölüm
        // bağı AÇILAMAZ (ölçüldü, `inventory/` SIFIR `section_id` isabeti);
        // panel bunu SÖYLER ve kullanıcıyı şantiye stok ekranına yönlendirir.
        // `sideLinkHref` TEK tanımı korunur — `carriesSection: false` kararı
        // burada da geçerlidir, `?section=` EKLENMEZ.
        return (
          <SectionStockPanel
            sectionName={section.name}
            stockHref={sideLinkHref(SIDE_LINKS.stock)}
          />
        );
      default:
        // "is-kalemleri". Yükleme/hata dalları AYRI basılır: `data` yokken boş
        // tabloya düşmek kullanıcıya "bu bölüme kalem atanmadı" YALANINI
        // söylerdi. Başka şantiyenin bölümü backend'de 404'tür.
        if (sectionBoq.isError) {
          return <p className="section-detail__message">İş kalemleri yüklenemedi</p>;
        }
        if (sectionBoq.isLoading || !sectionBoq.data) {
          return <p className="section-detail__message">Yükleniyor…</p>;
        }
        return (
          <SectionBoqCard
            groups={sectionBoq.data.groups}
            totals={sectionBoq.data.totals}
            sectionName={section.name}
          />
        );
    }
  }

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

      {/* 🔴 F-BLMSEK T3 — Malzeme artık jenerik `CardEmptyState` dalına
          DÜŞMEZ: `livePanel()` dispatch'i BEŞ sekmenin BEŞİNİ de kapsar
          (dördü gerçek veri, "stok" `SectionStockPanel` ile kendi spesifik
          gerekçesini basar). Eski `activeTabDef.contentLive` dalı jenerik
          şablonun TEK tüketicisiydi — o tüketici kalmadığı için ayrım silindi
          (BOQ-SEC-F / `section_boq` emsali: okuyanı kalmayan kod SİLİNİR). */}
      <div className="section-panel" role="tabpanel">
        <div className="section-panel__body section-panel__body--flush">{livePanel()}</div>
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
          {/* D219-246 — GERÇEK gruplanmış satırlar. Yer tutucu kart SİLİNDİ:
              bağ artık AÇIK, "henüz görüntülenemiyor" canlıyı yalanlardı. */}
          <SectionWorkersList
            groups={workerGroups}
            isLoading={timesheet.isLoading}
            isError={timesheet.isError}
            periodLabel={periodLabel}
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
