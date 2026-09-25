import { addDaysIso } from "@/components/site-planning/week";
import type { TimesheetWeek } from "@/lib/api/hooks/useTimesheet";

import { timesheetDraftKey, type TimesheetDraftCell } from "./timesheet-draft";
import type { TimesheetSourcedCell } from "./week-derive";

const DAYS_IN_WEEK = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Önceki hafta yanıtının kopyada okunan alt kümesi. */
export type CopySourceWeek = Pick<TimesheetWeek, "start_date"> & {
  readonly rows: readonly {
    readonly personnel_id: TimesheetWeek["rows"][number]["personnel_id"];
    readonly cells: readonly Pick<
      TimesheetWeek["rows"][number]["cells"][number],
      "work_date" | "hours" | "code" | "section_id"
    >[];
  }[];
};

export interface BuildCopyPreviousWeekDraftInput {
  /** Bu haftanın TAM kümesi (`TimesheetWeekDerived.allCells`). */
  allCells: readonly TimesheetSourcedCell[];
  previous: CopySourceWeek;
  /** Bu haftanın Pazartesi'si (ISO). */
  targetMonday: string;
  /** Bu haftanın KİLİTLİ günleri (§3.14 P2). */
  lockedDays: ReadonlySet<string>;
}

function toUtc(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

/**
 * "Önceki Haftayı Kopyala" (E5 75) gövdesi — SAF.
 *
 * 🔴 KOPYA DEĞİŞTİRMEDİR: bu haftanın var olan hücreleri, önceki haftada
 * karşılığı OLMAYAN günlerde de TEMİZLENİR — aksi hâlde "geçen haftanın
 * aynısı" düğmesi iki haftanın KARIŞIMINI üretirdi.
 *
 * 🔴 §3.14 P2 — KİLİTLİ GÜN ATLANIR: kilitli günde ne temizlik ne yazma
 * yapılır; o günün anahtarı taslağa HİÇ girmez, hücre sunucudaki değeriyle
 * kalır (P5: değişmeden taşınan kilitli gün 409 üretmez).
 */
export function buildCopyPreviousWeekDraft({
  allCells,
  previous,
  targetMonday,
  lockedDays,
}: BuildCopyPreviousWeekDraftInput): {
  entries: Record<string, TimesheetDraftCell | null>;
  cellCount: number;
} {
  const entries: Record<string, TimesheetDraftCell | null> = {};
  // 1) Bu haftanın MEVCUT hücreleri önce temizlenir — kilitli günler HARİÇ.
  for (const cell of allCells) {
    if (lockedDays.has(cell.work_date)) continue;
    entries[timesheetDraftKey(cell.personnelId, cell.work_date)] = null;
  }
  // 2) Önceki haftanın hücreleri aynı gün ofsetiyle yazılır — kilitli güne YAZILMAZ.
  let cellCount = 0;
  for (const row of previous.rows) {
    for (const cell of row.cells) {
      // Önceki haftanın Pazartesi'si yanıtın KENDİ `start_date`idir — uydurulmaz.
      const offset = Math.round(
        (toUtc(cell.work_date) - toUtc(previous.start_date)) / DAY_MS,
      );
      if (offset < 0 || offset >= DAYS_IN_WEEK) continue;
      const target = addDaysIso(targetMonday, offset);
      if (lockedDays.has(target)) continue;
      entries[timesheetDraftKey(row.personnel_id, target)] = {
        hours: cell.hours,
        code: cell.code,
        sectionId: cell.section_id,
      };
      cellCount += 1;
    }
  }
  return { entries, cellCount };
}
