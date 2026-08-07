"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { DiaryMonthNav } from "@/components/site-diary/DiaryMonthNav";
import { Button } from "@/components/ui/button/Button";
import { Select } from "@/components/ui/select/Select";
import { useSiteOptions } from "@/lib/api/hooks/useSiteOptions";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import { parsePeriod, shiftPeriod } from "./month";
import { TimesheetLegend } from "./TimesheetLegend";
import { TimesheetNotices } from "./TimesheetNotices";
import { TimesheetTable } from "./TimesheetTable";
import { useTimesheetData } from "./useTimesheetData";
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
 * T2 KAPSAMI: matris SALT-OKUNUR basılır. "Dışa Aktar" (E5 66) ve "Kaydet"
 * (E5 67) mockup'taki yerinde ve görünümünde DURUR, davranışları T3'e kalır —
 * devre dışı + görünür Türkçe gerekçe (`TimesheetNotices`).
 */
export function GeneralTimesheetView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const permission = useModulePermission("timesheet");
  const period = parsePeriod(searchParams.get("year"), searchParams.get("month"));
  const siteOptions = useSiteOptions();
  // Seçili şantiye URL'den; yoksa ilk seçenek (mockup seçiciyi HER ZAMAN dolu
  // çizer — boş bir seçici uydurulmaz).
  const siteParam = searchParams.get("site");
  const selectedSiteId =
    siteParam ?? siteOptions.options[0]?.siteId ?? "";

  const data = useTimesheetData({ siteId: selectedSiteId, period, sectionId: null });

  if (!permission.canView) return <AccessDenied />;
  if (data.isForbidden) return <AccessDenied />;

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
          {/* E5 66 — sunucu üretimli Excel; T3 bağlar */}
          <Button variant="secondary" disabled>
            Dışa Aktar
          </Button>
          {/* E5 67 */}
          <Button variant="primary" disabled>
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
