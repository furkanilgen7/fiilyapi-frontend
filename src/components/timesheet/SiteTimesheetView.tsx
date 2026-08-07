"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { SiteDetailTabs } from "@/components/site-detail/SiteDetailTabs";
import { DiaryMonthNav } from "@/components/site-diary/DiaryMonthNav";
import { Button } from "@/components/ui/button/Button";
import { Select } from "@/components/ui/select/Select";
import { useSiteSections } from "@/lib/api/hooks/useSiteSections";
import { useSite } from "@/lib/api/hooks/useSites";
import { formatPeriod } from "@/lib/format";
import { hasAtLeast } from "@/lib/auth/permissions";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import { AddPersonnelLink } from "./AddPersonnelLink";
import { timesheetEmptyMessage } from "./GeneralTimesheetView";
import { parsePeriod, shiftPeriod } from "./month";
import { TimesheetLegend } from "./TimesheetLegend";
import { TimesheetNotices } from "./TimesheetNotices";
import { TimesheetSaveStatus } from "./TimesheetSaveStatus";
import { TimesheetSummaryStrip } from "./TimesheetSummaryStrip";
import { TimesheetTable } from "./TimesheetTable";
import { useTimesheetData } from "./useTimesheetData";
import { useTimesheetEditor } from "./useTimesheetEditor";
import "@/components/site-detail/site-detail.css";
import "@/components/site-diary/site-diary-summary.css";
import "./timesheet.css";

/** ŞP 99 — "Tüm Bölümler" seçeneğinin URL/`<option>` değeri. */
const ALL_SECTIONS = "";

/**
 * Şantiye › Puantaj sekmesi — mockup `Şantiye - Puantaj.dc.html` (ŞP, kanonik).
 * Parantez/yorum içindeki sayılar o dosyanın SATIR numaralarıdır.
 *
 * Rota `.../santiyeler/[siteId]/puantaj`. Sayfa KENDİ LAYOUT'UNU KURMAZ —
 * drill sidebar `[projectId]/layout.tsx`ten gelir (F-PL/F-SD deseni).
 *
 * ⚠️ ŞEF KARARI K2 — bölüm filtresi (ŞP 99) İSTEMCİ TARAFINDA süzer:
 * `GET .../timesheet` HER ZAMAN SÜZGEÇSİZ çekilir (`useTimesheetData` üçüncü
 * argümanı VERMEZ), süzgeç yalnız görünüme uygulanır. Gerekçe `derive.ts`
 * başındadır: `PUT` dönem+şantiye kapsamında DEĞİŞTİRMEDİR ve gövde her zaman
 * ŞANTİYENİN TAM hücre kümesi olmalıdır; süzgeçli küme gönderilirse diğer
 * bölümlerin kayıtları SİLİNİR. Excel dışa aktarımı bunun İSTİSNASIDIR
 * (sunucu üretir, `section_id` oraya geçer — `useTimesheetEditor`).
 *
 * T3: hücreler yazma izninde tıklanabilir; "Kaydet" (ŞP 101) gövdeyi
 * `data.view.allCells` (şantiyenin TAM kümesi + taslak) üzerinden kurar,
 * "Excel" (ŞP 100) sunucu üretimli dosyayı indirir.
 */
export function SiteTimesheetView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projectId, siteId } = useParams<{ projectId: string; siteId: string }>();

  const permission = useModulePermission("timesheet");
  // F-PT T4 — "Personel Ekle" girişi AYRI modülün (personnel) yetkisine bağlı:
  // puantaj yazabilen herkes personel kartı açamaz. İzinsizde HİÇ basılmaz.
  const personnelPermission = useModulePermission("personnel");
  const canAddPersonnel = hasAtLeast(personnelPermission.level, "full");
  const period = parsePeriod(searchParams.get("year"), searchParams.get("month"));
  const sectionParam = searchParams.get("section") ?? ALL_SECTIONS;
  const sectionId = sectionParam === ALL_SECTIONS ? null : sectionParam;

  // Başlık için — drill kabuğu aynı anahtarı zaten çektiğinden ikinci bir ağ
  // isteği oluşmaz (React Query önbelleği; `is-kalemleri` deseni).
  const siteQuery = useSite(siteId);
  const sectionsQuery = useSiteSections(siteId);
  const editor = useTimesheetEditor({ siteId, period, sectionId });
  const data = useTimesheetData({ siteId, period, sectionId, draft: editor.draft });

  if (!permission.canView) return <AccessDenied />;
  if (data.isForbidden) return <AccessDenied />;

  const site = siteQuery.data;
  const sections = sectionsQuery.data?.items ?? [];
  const activeSectionName = sections.find((section) => section.id === sectionId)?.name;

  // Personel formundan bu sekmeye (aynı dönem + bölüm süzgeci) dönülür.
  const currentQuery = searchParams.toString();
  const returnTo = currentQuery.length > 0 ? `${pathname}?${currentQuery}` : pathname;

  function pushParams(next: { section?: string; year?: number; month?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.section !== undefined) {
      if (next.section === ALL_SECTIONS) params.delete("section");
      else params.set("section", next.section);
    }
    if (next.year !== undefined) params.set("year", String(next.year));
    if (next.month !== undefined) params.set("month", String(next.month));
    const query = params.toString();
    router.replace(query.length > 0 ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="ts ts--site">
      {/* ŞP 79-86 — sekme şeridi tek kaynaktan (`SiteDetailTabs`) */}
      <SiteDetailTabs projectId={projectId} siteId={siteId} activePath={pathname} />

      {/* ŞP 88-103 */}
      <div className="ts__head">
        <div>
          {/* ŞP 90 — şantiye adı yüklenene kadar uydurulmaz */}
          <h1 className="ts__title ts__title--site">
            {site ? `${site.name} — Puantaj` : "Puantaj"}
          </h1>
          {/* ŞP 91 — "Güneşkent Konut · Temmuz 2026" (ay GERÇEK takvimden) */}
          <p className="ts__subtitle">
            {site ? `${site.project.name} · ` : ""}
            {formatPeriod(period.year, period.month)}
          </p>
        </div>
        <div className="ts__head-actions">
          {/* F-PT T4 — mockup'ta YOK; spec §4 S2(a) onaylı türetimi. */}
          {canAddPersonnel && <AddPersonnelLink returnTo={returnTo} />}
          {/* ŞP 94-98 */}
          <DiaryMonthNav
            year={period.year}
            month={period.month}
            onShift={(delta) => pushParams(shiftPeriod(period, delta))}
          />
          {/* ŞP 99 — bölüm filtresi; GET'e GEÇMEZ (K2) */}
          <Select
            aria-label="Bölüm"
            value={sectionParam}
            onChange={(event) => pushParams({ section: event.target.value })}
          >
            <option value={ALL_SECTIONS}>Tüm Bölümler</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </Select>
          {/* ŞP 100 — dosyayı SUNUCU üretir, bölüm süzgeci ORAYA geçer (K2 istisnası) */}
          <Button
            variant="secondary"
            disabled={editor.isExporting}
            onClick={() => void editor.exportExcel()}
          >
            Excel
          </Button>
          {/* ŞP 101 — gövde ŞANTİYENİN TAM kümesidir (`allCells`), süzülmüş
              `rows` DEĞİL. Yazma izni yoksa devre dışı kalır (gerekçe
              `TimesheetNotices`te), değişiklik yokken de: gereksiz replace =
              gereksiz risk. */}
          <Button
            variant="primary"
            disabled={!permission.canWrite || !editor.isDirty || editor.saveState.kind === "saving"}
            onClick={() => void editor.save(data.view.allCells)}
          >
            Kaydet
          </Button>
        </div>
      </div>

      {/* ŞP 106-112 */}
      <TimesheetLegend variant="site" />

      <TimesheetNotices
        canWrite={permission.canWrite}
        isPersonnelUnavailable={data.isPersonnelUnavailable}
        personnelTruncation={data.personnelTruncation}
      />
      <TimesheetSaveStatus
        dirtyCount={editor.dirtyKeys.size}
        saveState={editor.saveState}
        exportError={editor.exportError}
      />
      {sectionsQuery.isError && (
        <p className="ts__message">
          Bölüm listesi yüklenemedi — filtre yalnız “Tüm Bölümler” gösteriyor.
        </p>
      )}

      {/* ŞP 115-253 */}
      <div className="ts-card">
        {/* ŞP 116-120 */}
        <TimesheetSummaryStrip
          title={activeSectionName ?? "Tüm Bölümler"}
          workerCount={data.view.workerCount}
          totalManDays={data.view.totalManDays}
          totalOvertimeHours={data.view.totalOvertimeHours}
        />
        <TimesheetTable
          variant="site"
          days={data.view.days}
          rows={data.view.rows}
          totalManDays={data.view.totalManDays}
          emptyMessage={timesheetEmptyMessage(data.isLoading, data.isError, siteId)}
          // Hiç personel yoksa matris boş kalır — izinliye ekleme yönlendirmesi.
          emptyAction={
            canAddPersonnel ? <AddPersonnelLink returnTo={returnTo} variant="primary" /> : undefined
          }
          canWrite={permission.canWrite}
          dirtyKeys={editor.dirtyKeys}
          onCommit={(personnelId, workDate, edit) =>
            editor.commitCell(data.view.allCells, personnelId, workDate, edit)
          }
        />
      </div>
    </div>
  );
}
