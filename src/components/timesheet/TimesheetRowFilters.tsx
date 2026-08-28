"use client";

import { Select } from "@/components/ui/select/Select";
import { WORKER_SOURCE_VALUES, resolveWorkerSourceLabel } from "./timesheet-codes";
import type { TimesheetWeekViewRow } from "./week-derive";

/** "Tüm …" seçeneğinin değeri — boş dize (URL'de parametre HİÇ durmaz). */
export const ALL_OPTION = "";

export interface TimesheetRowFilterState {
  trade: string;
  source: string;
  subcontractor: string;
}

export const EMPTY_ROW_FILTERS: TimesheetRowFilterState = {
  trade: ALL_OPTION,
  source: ALL_OPTION,
  subcontractor: ALL_OPTION,
};

/**
 * Meslek / çalışan türü / taşeron süzgeçleri (E5 100-122).
 *
 * 🔴 BU SÜZGEÇLERİN UÇ KARŞILIĞI YOKTUR — `GET .../timesheet/week` yalnız
 * `section_id` alır. Mockup öğesi SİLİNMEZ: süzgeç İSTEMCİ TARAFINDA uygulanır,
 * çünkü süzülecek üç alan (`trade` · `source` · `subcontractor_name`) satırın
 * KENDİSİNDE zaten gelir. Sunucuya gitmediği için kaydetme gövdesine de
 * sızamaz (gövde `allCells`ten kurulur, `rows`tan DEĞİL).
 *
 * Seçenekler mockup'ın sabit listesinden değil GELEN VERİDEN kurulur —
 * mockup'ın "Kalıpçı (14)" sayıları bu şantiyenin verisi değildir.
 */
export function TimesheetRowFilters({
  rows,
  value,
  onChange,
  shownCount,
  totalCount,
}: {
  /** Süzgeçten ÖNCEKİ satırlar — seçenek listesinin kaynağı. */
  rows: readonly TimesheetWeekViewRow[];
  value: TimesheetRowFilterState;
  onChange: (next: TimesheetRowFilterState) => void;
  shownCount: number;
  totalCount: number;
}) {
  const trades = distinct(rows.map((row) => row.trade));
  const subcontractors = distinct(rows.map((row) => row.subcontractorName));
  const sources = WORKER_SOURCE_VALUES.filter((source) =>
    rows.some((row) => row.source === source),
  );

  return (
    <>
      {/* E5 100-110 */}
      <Select
        aria-label="Meslek"
        value={value.trade}
        onChange={(event) => onChange({ ...value, trade: event.target.value })}
      >
        <option value={ALL_OPTION}>Tüm Meslekler ({totalCount})</option>
        {trades.map((trade) => (
          <option key={trade} value={trade}>
            {trade} ({rows.filter((row) => row.trade === trade).length})
          </option>
        ))}
      </Select>
      {/* E5 111-116 */}
      <Select
        aria-label="Çalışan türü"
        value={value.source}
        onChange={(event) => onChange({ ...value, source: event.target.value })}
      >
        <option value={ALL_OPTION}>Tüm Çalışan Türleri</option>
        {sources.map((source) => (
          <option key={source} value={source}>
            {resolveWorkerSourceLabel(source)}
          </option>
        ))}
      </Select>
      {/* E5 117-122 */}
      <Select
        aria-label="Taşeron firması"
        value={value.subcontractor}
        onChange={(event) => onChange({ ...value, subcontractor: event.target.value })}
      >
        <option value={ALL_OPTION}>Tüm Taşeron Firmaları</option>
        {subcontractors.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </Select>
      {/* E5 123-127 — "Gösterilen 4 / 48" */}
      <span className="ts-shown">
        <span className="ts-shown__label">Gösterilen</span>
        <span className="ts-shown__value">{shownCount}</span>
        <span className="ts-shown__total">/ {totalCount}</span>
      </span>
    </>
  );
}

/** Süzgeç yüklemi — `allCells`e DEĞİL, YALNIZ görünen satırlara uygulanır. */
export function rowMatchesFilters(
  row: TimesheetWeekViewRow,
  filters: TimesheetRowFilterState,
): boolean {
  if (filters.trade !== ALL_OPTION && row.trade !== filters.trade) return false;
  if (filters.source !== ALL_OPTION && row.source !== filters.source) return false;
  if (filters.subcontractor !== ALL_OPTION && row.subcontractorName !== filters.subcontractor) {
    return false;
  }
  return true;
}

function distinct(values: readonly (string | null)[]): string[] {
  return [
    ...new Set(values.filter((value): value is string => value !== null && value.length > 0)),
  ].sort((a, b) => a.localeCompare(b, "tr"));
}
