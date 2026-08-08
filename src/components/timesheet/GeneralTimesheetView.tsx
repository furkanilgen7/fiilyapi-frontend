"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { DiaryMonthNav } from "@/components/site-diary/DiaryMonthNav";
import { Button } from "@/components/ui/button/Button";
import { Select } from "@/components/ui/select/Select";
import { useSiteOptions } from "@/lib/api/hooks/useSiteOptions";
import { hasAtLeast } from "@/lib/auth/permissions";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import { AddPersonnelLink } from "./AddPersonnelLink";
import { parsePeriod, shiftPeriod } from "./month";
import { TimesheetLegend } from "./TimesheetLegend";
import { TimesheetNotices } from "./TimesheetNotices";
import { TimesheetSaveStatus } from "./TimesheetSaveStatus";
import { TimesheetTable } from "./TimesheetTable";
import { useTimesheetData } from "./useTimesheetData";
import { useTimesheetEditor } from "./useTimesheetEditor";
import "@/components/site-diary/site-diary-summary.css";
import "./timesheet.css";

/**
 * Ekran 5 · Genel Puantaj — mockup `Ekran 5 - Puantaj.dc.html` (E5, kanonik).
 * Parantez/yorum içindeki sayılar o dosyanın SATIR numaralarıdır.
 *
 * Rota `/puantaj` — ana kabuğun altındadır ([...slug] catch-all bu segment
 * için devre dışı kalır; özel segment her zaman catch-all'dan önce eşleşir).
 *
 * DÖNEM + ŞANTİYE URL'DEDİR (`?site=&year=&month=`) — bağlantı paylaşılabilir
 * olsun (F-PL `?week=` deseni). Mockup'ın "Temmuz 2026" sabiti KOPYALANMAZ
 * (tarih artefaktı istisnası): varsayılan içinde bulunulan gerçek aydır.
 *
 * T3: hücreler yazma izninde tıklanabilir. "Dışa Aktar" (E5 66) sunucu
 * üretimli Excel'i indirir, "Kaydet" (E5 67) gövdeyi `data.view.allCells`
 * (şantiyenin TAM kümesi + taslak) üzerinden kurar. Bu ekranda bölüm filtresi
 * YOKTUR (`sectionId: null`), yani yeni hücre bölümsüz açılır.
 */
export function GeneralTimesheetView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const permission = useModulePermission("timesheet");
  // F-PT T4 — "Personel Ekle" girişi AYRI modülün (personnel) yetkisine bağlı:
  // puantaj yazabilen herkes personel kartı açamaz. İzinsizde HİÇ basılmaz.
  const personnelPermission = useModulePermission("personnel");
  const canAddPersonnel = hasAtLeast(personnelPermission.level, "full");
  const period = parsePeriod(searchParams.get("year"), searchParams.get("month"));
  const siteOptions = useSiteOptions();
  // Seçili şantiye URL'den; yoksa ilk seçenek (mockup seçiciyi HER ZAMAN dolu
  // çizer — boş bir seçici uydurulmaz).
  const siteParam = searchParams.get("site");
  const selectedSiteId =
    siteParam ?? siteOptions.options[0]?.siteId ?? "";

  const editor = useTimesheetEditor({ siteId: selectedSiteId, period, sectionId: null });
  const data = useTimesheetData({
    siteId: selectedSiteId,
    period,
    sectionId: null,
    draft: editor.draft,
  });

  if (!permission.canView) return <AccessDenied />;
  if (data.isForbidden) return <AccessDenied />;

  // Personel formundan bu ekrana (aynı dönem + şantiye) dönülür.
  const query = searchParams.toString();
  const returnTo = query.length > 0 ? `${pathname}?${query}` : pathname;

  function pushParams(next: { site?: string; year?: number; month?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.site !== undefined) params.set("site", next.site);
    if (next.year !== undefined) params.set("year", String(next.year));
    if (next.month !== undefined) params.set("month", String(next.month));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="ts ts--general">
      {/* E5 62 */}
      <p className="ts__eyebrow">Saha &amp; İK</p>

      {/* E5 63-69 */}
      <div className="ts__head">
        <h1 className="ts__title">Puantaj</h1>
        <div className="ts__head-actions">
          {/* F-PT T4 — mockup'ta YOK; spec §4 S2(a) onaylı türetimi. */}
          {canAddPersonnel && <AddPersonnelLink returnTo={returnTo} />}
          {/* E5 66 — dosyayı SUNUCU üretir (K2 istisnası) */}
          <Button
            variant="secondary"
            disabled={selectedSiteId.length === 0 || editor.isExporting}
            onClick={() => void editor.exportExcel()}
          >
            Dışa Aktar
          </Button>
          {/* E5 67 — gövde ŞANTİYENİN TAM hücre kümesidir (`allCells`) */}
          <Button
            variant="primary"
            disabled={!permission.canWrite || !editor.isDirty || editor.saveState.kind === "saving"}
            onClick={() => void editor.save(data.view.allCells)}
          >
            Kaydet
          </Button>
        </div>
      </div>

      {/* E5 72-85 */}
      <div className="ts__controls">
        {/* E5 73-77 */}
        <DiaryMonthNav
          year={period.year}
          month={period.month}
          onShift={(delta) => pushParams(shiftPeriod(period, delta))}
        />
        {/* E5 78 — şantiye seçici */}
        <Select
          aria-label="Şantiye"
          value={selectedSiteId}
          disabled={siteOptions.options.length === 0}
          onChange={(event) => pushParams({ site: event.target.value })}
        >
          {siteOptions.options.length === 0 && (
            <option value="">
              {siteOptions.isLoading ? "Yükleniyor…" : "Şantiye yok"}
            </option>
          )}
          {siteOptions.options.map((option) => (
            <option key={option.siteId} value={option.siteId}>
              {option.label}
            </option>
          ))}
        </Select>
        {/* E5 79-84 */}
        <TimesheetLegend variant="general" />
      </div>

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
      {siteOptions.isError && (
        <p className="ts__message">Şantiye listesi yüklenemedi — matris gösterilemiyor.</p>
      )}

      {/* E5 88-217 */}
      <div className="ts-card">
        <TimesheetTable
          variant="general"
          days={data.view.days}
          rows={data.view.rows}
          totalManDays={data.view.totalManDays}
          emptyMessage={timesheetEmptyMessage(data.isLoading, data.isError, selectedSiteId)}
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

/** Boş gövdenin nedeni HER ZAMAN yazılır — sessiz boş tablo yok. */
export function timesheetEmptyMessage(
  isLoading: boolean,
  isError: boolean,
  siteId: string,
): string {
  if (siteId.length === 0) return "Şantiye seçin.";
  if (isError) return "Puantaj matrisi yüklenemedi.";
  if (isLoading) return "Yükleniyor…";
  return "Bu ay için puantaj kaydı ve aktif personel bulunmuyor.";
}
