import type { PersonnelListItem, WorkerSource } from "@/lib/api/hooks/usePersonnel";
import type { TimesheetCode, TimesheetMatrix } from "@/lib/api/hooks/useTimesheet";
import { sumDecimalStrings } from "@/lib/decimal";

import { monthDayIsoList } from "./month";

/**
 * AYLIK puantaj matrisinin TÜREV KATMANI — saf, bileşensiz, test edilebilir.
 *
 * 🔴 KAPSAM: bu katman artık YALNIZ SALT-OKUR yüzeylere hizmet eder — Bölüm
 * Detay'ın "İşçiler & Puantaj" sekmesi ve "Bu Bölümdeki İşçiler" kartı.
 * YAZMA yolu HAFTALIKTIR (`week-derive.ts` + `PUT .../timesheet/week`); aylık
 * `PUT` uçtan KALKTI. Bu yüzden burada `allCells`/taslak KAVRAMI YOKTUR:
 * kaydetme gövdesi bu dosyadan kurulamaz, yapısal olarak.
 *
 * ═══ K2 KORUNUR ═══
 * `GET .../timesheet` süzgeçsiz çekilir, bölüm filtresi YALNIZ bu görünüm
 * katmanında uygulanır — önbellek şantiye ekranıyla paylaşılsın diye.
 *
 * ═══ 🔴 SAAT XOR KOD ═══
 * Hücre artık ya SAATtir ya da KODtur (`leave`/`holiday`/`temporary_duty`).
 * `worked`/`overtime` kodları KALKTI. Adam-gün ARTIK TÜREVDİR (saat ÷ normal
 * gün saati) ve tek kaynağı backend'dir — aylık uç `normal_day_hours`
 * YAYINLAMADIĞI için bu katman adam-gün HESAPLAMAZ, saat toplar.
 */

export interface TimesheetViewCell {
  hours: string | null;
  code: TimesheetCode | null;
  sectionId: string | null;
}

export interface TimesheetViewRow {
  personnelId: string;
  fullName: string;
  trade: string | null;
  source: WorkerSource;
  subcontractorName: string | null;
  /** `YYYY-MM-DD` → hücre. Girilmemiş gün ANAHTAR TAŞIMAZ (matris seyrektir). */
  cells: Record<string, TimesheetViewCell>;
  /** Görünen hücrelerin saat toplamı. */
  totalHours: string;
}

export interface TimesheetDayColumn {
  workDate: string;
  /** Ayın günü — sütun başlığı. */
  dayOfMonth: number;
  /** Günün saat toplamı (görünen kümeden). */
  totalHours: string;
  /** SAATLİ hücre sayısı; kodlu hücre çalışılmış değildir. */
  workedDayCount: number;
  leaveCount: number;
  temporaryDutyCount: number;
}

export interface TimesheetDerived {
  days: TimesheetDayColumn[];
  rows: TimesheetViewRow[];
  /** Görünen kümede EN AZ BİR hücresi olan personel. */
  workerCount: number;
  /** Ay toplamı — düz saat toplaması (türev değil). */
  totalHours: string;
  /** Normal gün saati (renk eşiği) — uç yayınlamıyorsa `null`, UYDURULMAZ. */
  normalDayHours: string | null;
}

export interface BuildTimesheetViewInput {
  year: number;
  month: number;
  /** `GET /personnel?is_active=true` çıktısı (K1 — satır kümesinin kaynağı). */
  personnel: readonly PersonnelListItem[] | undefined;
  /** `GET .../timesheet` çıktısı — SÜZGEÇSİZ çekilmiş TAM matris (K2). */
  matrix: TimesheetMatrix | undefined;
  /** Görünüm süzgeci; `null` = Tüm Bölümler. */
  sectionId: string | null;
  /**
   * Saat renk eşiği. Aylık uç `normal_day_hours` YAYINLAMAZ; çağıran biliyorsa
   * (haftalık uçtan) geçirir, bilmiyorsa `null` kalır ve renk eşiği basılmaz.
   */
  normalDayHours?: string | null;
}

interface SourcedCell extends TimesheetViewCell {
  personnelId: string;
  workDate: string;
}

/**
 * ═══ ŞEF KARARI K1 — SATIR KÜMESİ `GET /personnel`'DEN KURULUR ═══
 * Backend satırları YALNIZ var olan hücrelerden türetir: o ay hiç kaydı
 * olmayan personel matriste GÖRÜNMEZ. Satırlar bu yüzden AKTİF PERSONEL
 * KARTOTEKSİNDEN kurulur; matristen gelen hücreler `personnel_id` ile eşlenir.
 * BİRLEŞİM: kartotekste olmayan ama matriste hücresi olan personel de satır
 * alır (ör. sonradan pasifleştirilmiş işçi) — kayıt gizlenmez.
 */
export function buildTimesheetView({
  year,
  month,
  personnel,
  matrix,
  sectionId,
  normalDayHours = null,
}: BuildTimesheetViewInput): TimesheetDerived {
  const cells = collectSourcedCells(matrix).filter((cell) => cellInSection(cell, sectionId));
  const rows = buildRows(personnel, matrix, cells);
  const days = buildDayColumns(year, month, cells);

  return {
    days,
    rows,
    workerCount: rows.filter((row) => Object.keys(row.cells).length > 0).length,
    totalHours: sumDecimalStrings(rows.map((row) => row.totalHours)),
    normalDayHours,
  };
}

function collectSourcedCells(matrix: TimesheetMatrix | undefined): SourcedCell[] {
  if (!matrix) return [];
  return matrix.rows.flatMap((row) =>
    row.cells.map((cell) => ({
      personnelId: row.personnel_id,
      workDate: cell.work_date,
      hours: cell.hours,
      code: cell.code,
      sectionId: cell.section_id,
    })),
  );
}

function cellInSection(cell: SourcedCell, sectionId: string | null): boolean {
  return sectionId === null || cell.sectionId === sectionId;
}

function cellHours(cell: { hours: string | null }): string {
  return cell.hours !== null && cell.hours.trim().length > 0 ? cell.hours : "0";
}

function buildRows(
  personnel: readonly PersonnelListItem[] | undefined,
  matrix: TimesheetMatrix | undefined,
  cells: readonly SourcedCell[],
): TimesheetViewRow[] {
  const byPersonnel = new Map<string, TimesheetViewRow>();

  // 1) Kartoteks (K1) — hücresi olmayan aktif personel de satır alır.
  for (const person of personnel ?? []) {
    byPersonnel.set(person.id, {
      personnelId: person.id,
      fullName: person.full_name,
      trade: person.trade,
      source: person.source,
      // Kartoteks taşeron ADINI taşımaz; ad matristen gelir, gelmiyorsa
      // UYDURULMAZ.
      subcontractorName: null,
      cells: {},
      totalHours: "0",
    });
  }

  // 2) Matris satırları — kartotekste olmayanı EKLER, olanı zenginleştirir.
  for (const row of matrix?.rows ?? []) {
    const existing = byPersonnel.get(row.personnel_id);
    byPersonnel.set(row.personnel_id, {
      personnelId: row.personnel_id,
      fullName: row.full_name,
      trade: row.trade,
      source: row.source,
      subcontractorName: row.subcontractor_name,
      cells: existing?.cells ?? {},
      totalHours: "0",
    });
  }

  // 3) Hücreleri satırlara dağıt (küme ZATEN bölüm süzgeçlidir).
  for (const cell of cells) {
    const row = byPersonnel.get(cell.personnelId);
    if (!row) continue;
    row.cells[cell.workDate] = {
      hours: cell.hours,
      code: cell.code,
      sectionId: cell.sectionId,
    };
  }

  for (const row of byPersonnel.values()) {
    row.totalHours = sumDecimalStrings(Object.values(row.cells).map(cellHours));
  }

  return [...byPersonnel.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));
}

/**
 * Gün iskeleti AYIN TAMAMIDIR — matristen DEĞİL: hücreler seyrektir, hiç kaydı
 * olmayan ay bile 31 sütun basmalıdır.
 */
function buildDayColumns(
  year: number,
  month: number,
  cells: readonly SourcedCell[],
): TimesheetDayColumn[] {
  return monthDayIsoList(year, month).map((workDate) => {
    const dayCells = cells.filter((cell) => cell.workDate === workDate);
    return {
      workDate,
      dayOfMonth: Number(workDate.slice(-2)),
      totalHours: sumDecimalStrings(dayCells.map(cellHours)),
      workedDayCount: dayCells.filter((cell) => cell.code === null).length,
      leaveCount: dayCells.filter((cell) => cell.code === "leave").length,
      temporaryDutyCount: dayCells.filter((cell) => cell.code === "temporary_duty").length,
    };
  });
}
