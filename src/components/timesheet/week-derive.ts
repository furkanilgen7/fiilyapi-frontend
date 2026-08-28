import type { PersonnelListItem, WorkerSource } from "@/lib/api/hooks/usePersonnel";
import type {
  TimesheetCell,
  TimesheetCode,
  TimesheetWeek,
} from "@/lib/api/hooks/useTimesheet";
import { sumDecimalStrings } from "@/lib/decimal";

import { isoWeekDates, type TimesheetIsoWeek } from "./iso-week";
import {
  EMPTY_TIMESHEET_DRAFT,
  isEmptyCell,
  mergeDraftCells,
  timesheetDraftKey,
  type TimesheetDraft,
} from "./timesheet-draft";

/**
 * HAFTALIK puantajın TÜREV KATMANI (PUAN-SAAT) — saf, bileşensiz.
 *
 * ═══ ŞEF KARARI K2 (haftaya taşındı) — BÖLÜM FİLTRESİ İSTEMCİ TARAFINDA ═══
 * `GET .../timesheet/week` HER ZAMAN SÜZGEÇSİZ çekilir (`section_id`
 * GÖNDERİLMEZ); ekran şantiyenin TAM hafta kümesini elde tutar ve bölüm
 * filtresini YALNIZ bu görünüm katmanında uygular.
 *
 * GEREKÇE: `PUT` HAFTA+şantiye kapsamında DEĞİŞTİRMEDİR ve gövde HER ZAMAN
 * şantiyenin o haftaya ait TAM hücre kümesi olmalıdır. Süzgeçli küme
 * gönderilirse diğer bölümlerin o haftaya ait TÜM kayıtları sessizce SİLİNİR.
 * (Ayın öbür haftaları kapsam dışıdır ve etkilenmez — kapsam AY DEĞİL HAFTA.)
 *
 * ═══ 🔴 NE HESAPLANIR, NE HESAPLANMAZ ═══
 *   • SAAT TOPLAMLARI hesaplanır (düz ondalık toplama; süzgeçli görünümde
 *     backend'in süzgeçsiz `day_totals`i yanlış olurdu).
 *   • NORMAL / FAZLA MESAİ AYRIMI **HESAPLANMAZ** — haftalık 45 saat tavanı
 *     ile günlük normal saat tavanının BİRLEŞİMİDİR ve tek kaynağı backend'in
 *     `TimesheetRowTotals`udur. Ekranda yeniden türetilirse iki taraf farklı
 *     cevap verir ve bordro ile puantaj tutmaz.
 *     🔴 Bir satırın Normal/FM değeri KİŞİ-HAFTA özelliğidir, bölüm
 *     özelliği DEĞİL: bölüm süzgeci onu değiştirmez, süzülmez.
 *   • Taslak (kaydedilmemiş) değişiklik varsa backend türevi BAYATTIR;
 *     `isStale` ile işaretlenir — sessizce eski sayı basılmaz.
 */

export interface TimesheetWeekViewCell {
  /** Saat XOR kod: ikisi birden dolu olmaz. */
  hours: string | null;
  code: TimesheetCode | null;
  sectionId: string | null;
}

/** Personel kimliğiyle etiketlenmiş ham hücre (kaydetme gövdesinin girdisi). */
export interface TimesheetSourcedCell extends TimesheetCell {
  personnelId: string;
}

export interface TimesheetWeekViewRow {
  personnelId: string;
  fullName: string;
  trade: string | null;
  source: WorkerSource;
  subcontractorName: string | null;
  /** `YYYY-MM-DD` → hücre. Girilmemiş gün ANAHTAR TAŞIMAZ (matris seyrektir). */
  cells: Record<string, TimesheetWeekViewCell>;
  /** Görünen hücrelerin saat toplamı — DÜZ toplam, türev değil (E5 249). */
  totalHours: string;
  /** Backend türevi (E5 247); satır sunucuda yoksa `null` — uydurulmaz. */
  normalHours: string | null;
  /** Backend türevi (E5 248); `null` = sunucu henüz bu satırı bilmiyor. */
  overtimeHours: string | null;
  /** Bu satırda kaydedilmemiş düzenleme var → Normal/FM BAYAT. */
  isStale: boolean;
}

export interface TimesheetWeekDayColumn {
  workDate: string;
  /** "Pzt" (E5 217) */
  weekday: string;
  /** "13 Tem" (E5 217) */
  dayMonth: string;
  /** Cmt/Paz sütunları ayrı zemin taşır (E5 222-223). */
  isSaturday: boolean;
  isSunday: boolean;
  /** Günlük saat toplamı (E5 313-319) — görünen kümeden. */
  totalHours: string;
  /** SAATLİ hücre sayısı; kodlu hücre çalışılmış değildir. */
  workedDayCount: number;
  leaveCount: number;
  temporaryDutyCount: number;
}

export interface TimesheetWeekDerived {
  days: TimesheetWeekDayColumn[];
  rows: TimesheetWeekViewRow[];
  /** Görünen kümede EN AZ BİR hücresi olan personel sayısı. */
  workerCount: number;
  /** tfoot + KPI: görünen satırların saat toplamı (E5 325). */
  totalHours: string;
  /** tfoot + KPI Normal (E5 323) — görünen satırların BACKEND değerlerinin toplamı. */
  normalHours: string;
  /** tfoot + KPI Fazla Mesai (E5 324) — aynı kaynak. */
  overtimeHours: string;
  /** Görünen kümede kaydedilmemiş düzenleme var → Normal/FM BAYAT. */
  isStale: boolean;
  /** KPI "İzin" — GÜN sayısı (E5 189-194). */
  leaveDayCount: number;
  /** 🔴 KPI "Geçici Görev" — izinden AYRI (yönetim kararı 2026-08-28). */
  temporaryDutyDayCount: number;
  /**
   * Şantiyenin o haftaya ait TAM (SÜZÜLMEMİŞ) hücre kümesi — K2'nin dayanağı.
   * Kaydetme gövdesi BUNDAN kurulur; `rows` süzülmüştür ve gövde olarak
   * KULLANILAMAZ.
   */
  allCells: readonly TimesheetSourcedCell[];
}

export interface BuildTimesheetWeekViewInput {
  week: TimesheetIsoWeek;
  /** `GET /personnel?is_active=true` çıktısı (K1 — satır kümesinin kaynağı). */
  personnel: readonly PersonnelListItem[] | undefined;
  /** `GET .../timesheet/week` çıktısı — SÜZGEÇSİZ çekilmiş TAM hafta (K2). */
  weekData: TimesheetWeek | undefined;
  /** Görünüm süzgeci; `null` = Tüm Bölümler (E5 98 · ŞP). */
  sectionId: string | null;
  /** Ek görünüm süzgeçleri (E5 100-122) — YALNIZ satırları eler. */
  rowFilter?: (row: TimesheetWeekViewRow) => boolean;
  /** Kaydedilmemiş yerel düzenlemeler — türevlere anında yansır. */
  draft?: TimesheetDraft;
}

const WEEKDAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const SATURDAY_INDEX = 5;
const SUNDAY_INDEX = 6;

/**
 * ═══ ŞEF KARARI K1 — SATIR KÜMESİ `GET /personnel`'DEN KURULUR ═══
 * Backend satırları YALNIZ var olan hücrelerden türetir: o hafta hiç kaydı
 * olmayan personel yanıtta GÖRÜNMEZ. Satırlar bu yüzden AKTİF PERSONEL
 * KARTOTEKSİNDEN kurulur, haftadan gelen hücreler `personnel_id` ile eşlenir.
 * Aksi hâlde yeni eklenen işçiye puantaj hiç girilemez.
 *
 * BİRLEŞİM (union): kartotekste olmayan ama haftada hücresi olan personel de
 * satır alır — aksi hâlde hücreleri görünmez olur ve kaydetme gövdesinden
 * düşerek SİLİNİRDİ.
 */
export function buildTimesheetWeekView({
  week,
  personnel,
  weekData,
  sectionId,
  rowFilter,
  draft = EMPTY_TIMESHEET_DRAFT,
}: BuildTimesheetWeekViewInput): TimesheetWeekDerived {
  const allCells = mergeDraftCells(collectSourcedCells(weekData), draft);
  const days = buildDayColumns(week, allCells, sectionId);
  const rows = buildRows(personnel, weekData, allCells, sectionId, draft).filter(
    (row) => rowFilter === undefined || rowFilter(row),
  );

  const visibleRows = rows.filter((row) => Object.keys(row.cells).length > 0);
  return {
    days,
    rows,
    workerCount: visibleRows.length,
    totalHours: sumDecimalStrings(rows.map((row) => row.totalHours)),
    // 🔴 TOPLANIR, HESAPLANMAZ: her satırın Normal/FM değeri backend'den gelir.
    normalHours: sumDecimalStrings(
      rows.map((row) => row.normalHours).filter((value): value is string => value !== null),
    ),
    overtimeHours: sumDecimalStrings(
      rows.map((row) => row.overtimeHours).filter((value): value is string => value !== null),
    ),
    isStale: rows.some((row) => row.isStale),
    leaveDayCount: countCode(rows, "leave"),
    temporaryDutyDayCount: countCode(rows, "temporary_duty"),
    allCells,
  };
}

function countCode(rows: readonly TimesheetWeekViewRow[], code: TimesheetCode): number {
  return rows.reduce(
    (sum, row) => sum + Object.values(row.cells).filter((cell) => cell.code === code).length,
    0,
  );
}

function collectSourcedCells(weekData: TimesheetWeek | undefined): TimesheetSourcedCell[] {
  if (!weekData) return [];
  return weekData.rows.flatMap((row) =>
    row.cells.map((cell) => ({ ...cell, personnelId: row.personnel_id })),
  );
}

function cellInSection(cell: TimesheetSourcedCell, sectionId: string | null): boolean {
  return sectionId === null || cell.section_id === sectionId;
}

function cellHours(cell: { hours: string | null }): string {
  return cell.hours !== null && cell.hours.trim().length > 0 ? cell.hours : "0";
}

function buildRows(
  personnel: readonly PersonnelListItem[] | undefined,
  weekData: TimesheetWeek | undefined,
  allCells: readonly TimesheetSourcedCell[],
  sectionId: string | null,
  draft: TimesheetDraft,
): TimesheetWeekViewRow[] {
  const byPersonnel = new Map<string, TimesheetWeekViewRow>();

  const blank = (
    personnelId: string,
    fullName: string,
    trade: string | null,
    source: WorkerSource,
    subcontractorName: string | null,
    cells: Record<string, TimesheetWeekViewCell>,
  ): TimesheetWeekViewRow => ({
    personnelId,
    fullName,
    trade,
    source,
    subcontractorName,
    cells,
    totalHours: "0",
    normalHours: null,
    overtimeHours: null,
    isStale: false,
  });

  // 1) Kartoteks (K1) — hücresi olmayan aktif personel de satır alır.
  for (const person of personnel ?? []) {
    // Kartoteks taşeron ADINI taşımaz (yalnız `subcontractor_id`); ad haftadan
    // gelir, gelmiyorsa UYDURULMAZ.
    byPersonnel.set(person.id, blank(person.id, person.full_name, person.trade, person.source, null, {}));
  }

  // 2) Hafta satırları — kartotekste olmayanı EKLER, olanı zenginleştirir.
  for (const row of weekData?.rows ?? []) {
    const existing = byPersonnel.get(row.personnel_id);
    const next = blank(
      row.personnel_id,
      row.full_name,
      row.trade,
      row.source,
      row.subcontractor_name,
      existing?.cells ?? {},
    );
    // 🔴 Normal/FM SUNUCUDAN okunur, ekranda hesaplanmaz.
    next.normalHours = row.totals.normal_hours;
    next.overtimeHours = row.totals.overtime_hours;
    byPersonnel.set(row.personnel_id, next);
  }

  // 3) Hücreleri (bölüm süzgeciyle) satırlara dağıt.
  for (const cell of allCells) {
    if (!cellInSection(cell, sectionId)) continue;
    const row = byPersonnel.get(cell.personnelId);
    if (!row) continue;
    row.cells[cell.work_date] = {
      hours: cell.hours,
      code: cell.code,
      sectionId: cell.section_id,
    };
  }

  // 4) Satır toplamı (düz saat toplamı) + bayatlık işareti.
  for (const row of byPersonnel.values()) {
    row.totalHours = sumDecimalStrings(Object.values(row.cells).map(cellHours));
    row.isStale = Object.keys(draft).some(
      (key) => key.startsWith(`${row.personnelId}|`),
    );
  }

  return [...byPersonnel.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));
}

/**
 * Gün iskeleti HAFTANIN YEDİ GÜNÜDÜR — yanıttan DEĞİL: hücreler seyrektir ve
 * hiç kaydı olmayan hafta bile 7 sütun basmalıdır.
 */
function buildDayColumns(
  week: TimesheetIsoWeek,
  allCells: readonly TimesheetSourcedCell[],
  sectionId: string | null,
): TimesheetWeekDayColumn[] {
  return isoWeekDates(week).map((workDate, index) => {
    const dayCells = allCells.filter(
      (cell) => cell.work_date === workDate && cellInSection(cell, sectionId) && !isEmptyCell(cell),
    );
    return {
      workDate,
      weekday: WEEKDAY_LABELS[index] ?? "",
      dayMonth: formatDayMonth(workDate),
      isSaturday: index === SATURDAY_INDEX,
      isSunday: index === SUNDAY_INDEX,
      totalHours: sumDecimalStrings(dayCells.map(cellHours)),
      workedDayCount: dayCells.filter((cell) => cell.code === null).length,
      leaveCount: dayCells.filter((cell) => cell.code === "leave").length,
      temporaryDutyCount: dayCells.filter((cell) => cell.code === "temporary_duty").length,
    };
  });
}

const TR_MONTHS_SHORT = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

/** "13 Tem" (E5 217) — `Intl` yerine sabit tablo: TR kısaltmaları platforma göre oynar. */
function formatDayMonth(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${TR_MONTHS_SHORT[(month ?? 1) - 1] ?? ""}`;
}

/** Hücrenin taslakta olup olmadığı — matris "kaydedilmemiş" işareti için. */
export function isDraftCell(draft: TimesheetDraft, personnelId: string, workDate: string): boolean {
  return Object.hasOwn(draft, timesheetDraftKey(personnelId, workDate));
}
