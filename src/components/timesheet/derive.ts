import type { PersonnelListItem, WorkerSource } from "@/lib/api/hooks/usePersonnel";
import type { TimesheetCell, TimesheetCode, TimesheetMatrix } from "@/lib/api/hooks/useTimesheet";
import { sumDecimalStrings } from "@/lib/decimal";

import { monthDayIsoList } from "./month";
import type { TimesheetVariant } from "./timesheet-codes";

/**
 * Puantaj matrisinin TÜREV KATMANI (F-PT T2) — saf, bileşensiz, test edilebilir.
 *
 * ═══ ŞEF KARARI K2 — BÖLÜM FİLTRESİ İSTEMCİ TARAFINDA SÜZER ═══
 * `GET /sites/{id}/timesheet` HER ZAMAN SÜZGEÇSİZ çekilir (`section_id`
 * GÖNDERİLMEZ); ekran şantiyenin TAM hücre kümesini elde tutar ve bölüm
 * filtresini YALNIZ bu görünüm katmanında uygular.
 *
 * GEREKÇE: `PUT .../timesheet` dönem+şantiye kapsamında DEĞİŞTİRMEDİR ve gövde
 * HER ZAMAN şantiyenin TAM hücre kümesi olmalıdır. Süzgeçli küme gönderilirse
 * diğer bölümlerin o aya ait TÜM kayıtları sessizce SİLİNİR. Tam kümeyi her an
 * elde tutmak bu tuzağı YAPISAL OLARAK imkânsız kılar — T3'ün kaydetme gövdesi
 * `TimesheetDerived.allCells` üzerinden kurulur, `rows` üzerinden DEĞİL.
 * (İstisna: Excel dışa aktarımını SUNUCU üretir; `section_id` ORAYA geçirilir.)
 *
 * Süzülmüş kümeden yeniden hesaplanan türevler backend'in süzgeçli çıktısıyla
 * BİREBİR aynı sonucu verir — kurallar backend kanonundan:
 *   • adam-gün = `worked` + `overtime` (`temporary_duty`/`leave`/`holiday` SAYILMAZ)
 *   • `+` yalnız bir İŞARETTİR, sayıyı değiştirmez (o günde en az bir FM varsa)
 *   • `G` AYRI sayaçtır (`temporary_duty_count`)
 *   • FM saat toplamı YALNIZ girilmiş saatlerden (saatsiz FM 0 katar)
 */

/** Adam-güne sayılan kodlar — backend `countsAsManDay` ile birebir. */
export function countsAsManDay(code: TimesheetCode): boolean {
  return code === "worked" || code === "overtime";
}

export interface TimesheetViewCell {
  code: TimesheetCode;
  overtimeHours: string | null;
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
  /** Bu satırın adam-günü (görünen/süzülmüş kümeden). */
  manDays: number;
}

export interface TimesheetDayColumn {
  workDate: string;
  /** Ayın günü (E5 94-109 · ŞP 127-142 başlıkları). */
  dayOfMonth: number;
  /** Günlük Toplam sayısı (E5 198 · ŞP 232). */
  workedCount: number;
  /** `4+` işareti (ŞP 237): o günde en az bir FM hücresi var. */
  hasOvertime: boolean;
  /** `3G` işareti (ŞP 245). */
  temporaryDutyCount: number;
}

export interface TimesheetDerived {
  days: TimesheetDayColumn[];
  rows: TimesheetViewRow[];
  /** "48 işçi" (ŞP 118) — görünen kümede EN AZ BİR hücresi olan personel. */
  workerCount: number;
  /** "864 adam/gün" (ŞP 119) + tfoot genel toplamı (E5 213 · ŞP 248). */
  totalManDays: number;
  /** "128 saat fazla mesai" (ŞP 119) — ondalık STRING, float aritmetiği yok. */
  totalOvertimeHours: string;
  /**
   * Şantiyenin TAM (SÜZÜLMEMİŞ) hücre kümesi — K2'nin dayanağı. T3'ün
   * kaydetme gövdesi BUNDAN kurulur; `rows` bölüm filtresine göre süzülmüştür
   * ve kaydetme gövdesi olarak KULLANILAMAZ.
   */
  allCells: readonly TimesheetSourcedCell[];
}

/** Personel kimliğiyle etiketlenmiş ham hücre (kaydetme gövdesinin girdisi). */
export interface TimesheetSourcedCell extends TimesheetCell {
  personnelId: string;
}

export interface BuildTimesheetViewInput {
  year: number;
  month: number;
  /** `GET /personnel?is_active=true` çıktısı (K1 — satır kümesinin kaynağı). */
  personnel: readonly PersonnelListItem[] | undefined;
  /** `GET .../timesheet` çıktısı — SÜZGEÇSİZ çekilmiş TAM matris (K2). */
  matrix: TimesheetMatrix | undefined;
  /** Görünüm süzgeci; `null` = Tüm Bölümler (ŞP 99). */
  sectionId: string | null;
}

/**
 * ═══ ŞEF KARARI K1 — SATIR KÜMESİ `GET /personnel`'DEN KURULUR ═══
 * Backend matris satırlarını YALNIZ var olan hücrelerden türetir: o ay hiç
 * kaydı olmayan personel matriste GÖRÜNMEZ. Satırlar bu yüzden AKTİF PERSONEL
 * KARTOTEKSİNDEN kurulur, matristen gelen hücreler `personnel_id` ile bu
 * satırlara EŞLENİR. Aksi hâlde yeni eklenen işçiye puantaj hiç girilemez
 * (canlıda "matris sonsuza dek boş" hatası).
 *
 * BİRLEŞİM (union): kartotekste olmayan ama matriste hücresi olan personel de
 * satır alır (ör. sonradan pasifleştirilmiş işçi). Aksi hâlde hücreleri
 * ekranda görünmez olur ve T3'ün kaydetme gövdesinden düşerek SİLİNİRDİ.
 *
 * Sıralama backend'in ada göre sıralı çıktısıyla tutarlıdır (tr-TR).
 */
export function buildTimesheetView({
  year,
  month,
  personnel,
  matrix,
  sectionId,
}: BuildTimesheetViewInput): TimesheetDerived {
  const allCells = collectSourcedCells(matrix);
  const rows = buildRows(personnel, matrix, allCells, sectionId);
  const days = buildDayColumns(year, month, allCells, sectionId);

  const visibleCells = allCells.filter((cell) => cellInSection(cell, sectionId));
  const overtimeValues = visibleCells
    .map((cell) => cell.overtime_hours)
    .filter((hours): hours is string => hours !== null && hours.trim().length > 0);

  return {
    days,
    rows,
    workerCount: rows.filter((row) => Object.keys(row.cells).length > 0).length,
    totalManDays: rows.reduce((sum, row) => sum + row.manDays, 0),
    // Ondalık toplama STRING üzerinden (`src/lib/decimal.ts`) — float yasak.
    totalOvertimeHours: sumDecimalStrings(overtimeValues),
    allCells,
  };
}

function collectSourcedCells(matrix: TimesheetMatrix | undefined): TimesheetSourcedCell[] {
  if (!matrix) return [];
  return matrix.rows.flatMap((row) =>
    row.cells.map((cell) => ({ ...cell, personnelId: row.personnel_id })),
  );
}

function cellInSection(cell: TimesheetSourcedCell, sectionId: string | null): boolean {
  return sectionId === null || cell.section_id === sectionId;
}

function buildRows(
  personnel: readonly PersonnelListItem[] | undefined,
  matrix: TimesheetMatrix | undefined,
  allCells: readonly TimesheetSourcedCell[],
  sectionId: string | null,
): TimesheetViewRow[] {
  const byPersonnel = new Map<string, TimesheetViewRow>();

  // 1) Kartoteks (K1) — hücresi olmayan aktif personel de satır alır.
  for (const person of personnel ?? []) {
    byPersonnel.set(person.id, {
      personnelId: person.id,
      fullName: person.full_name,
      trade: person.trade,
      source: person.source,
      // Kartoteks taşeron ADINI taşımaz (yalnız `subcontractor_id`); ad
      // matristen gelir, gelmiyorsa UYDURULMAZ.
      subcontractorName: null,
      cells: {},
      manDays: 0,
    });
  }

  // 2) Matris satırları — kartotekste olmayanı EKLER, olanın adını zenginleştirir.
  for (const row of matrix?.rows ?? []) {
    const existing = byPersonnel.get(row.personnel_id);
    byPersonnel.set(row.personnel_id, {
      personnelId: row.personnel_id,
      fullName: row.full_name,
      trade: row.trade,
      source: row.source,
      subcontractorName: row.subcontractor_name,
      cells: existing?.cells ?? {},
      manDays: 0,
    });
  }

  // 3) Hücreleri (bölüm süzgeciyle) satırlara dağıt + adam-günü say.
  for (const cell of allCells) {
    if (!cellInSection(cell, sectionId)) continue;
    const row = byPersonnel.get(cell.personnelId);
    if (!row) continue;
    row.cells[cell.work_date] = {
      code: cell.code,
      overtimeHours: cell.overtime_hours,
      sectionId: cell.section_id,
    };
    if (countsAsManDay(cell.code)) row.manDays += 1;
  }

  return [...byPersonnel.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));
}

function buildDayColumns(
  year: number,
  month: number,
  allCells: readonly TimesheetSourcedCell[],
  sectionId: string | null,
): TimesheetDayColumn[] {
  return monthDayIsoList(year, month).map((workDate) => {
    const dayCells = allCells.filter(
      (cell) => cell.work_date === workDate && cellInSection(cell, sectionId),
    );
    return {
      workDate,
      dayOfMonth: Number(workDate.slice(-2)),
      // FM'li gün ÇALIŞILMIŞ sayılır (E5 203), geçici görev SAYILMAZ (ŞP 245).
      workedCount: dayCells.filter((cell) => countsAsManDay(cell.code)).length,
      hasOvertime: dayCells.some((cell) => cell.code === "overtime"),
      temporaryDutyCount: dayCells.filter((cell) => cell.code === "temporary_duty").length,
    };
  });
}

/**
 * Ayak satırı hücresinin METNİ (E5 198-213 · ŞP 232-248).
 *
 * ⚠️ İKİ AYRI KURAL — işaretler VARYANTA GÖRE basılır (kullanıcı kararı,
 * 2026-08-07: "mockup birebir, ekran başına ayrı"):
 *   • `site` (ŞP 232-246): `+` (ŞP 237) ve `G` (ŞP 245) BASILIR.
 *   • `general` (E5 198-211): İŞARET YOK — YALNIZ SAYI. E5 120'de Mehmet'in
 *     6. günü FM'dir ve E5 203'te o sütunun ayak değeri düz `4`tür; yani E5
 *     FM verisi VARKEN BİLE `+` basmaz. Bu mockup'ın bilinçli tercihidir,
 *     eksiklik değil.
 *
 * SAYI HER İKİ VARYANTTA DA `workedCount`tur; `+`/`G` sayıyı DEĞİŞTİRMEZ.
 * ŞP 245'in "3G"si bunun kanıtıdır: o sütunda DÖRT kişinin kaydı vardır
 * (üçü çalıştı, biri geçici görevde) ve sayı 3'tür — geçici görev adam-güne
 * de günlük toplama da girmez.
 *
 * İki işaretin AYNI günde düşmesi mockup'ta yoktur; `site`de ikisi de basılır
 * ("4+G") — biri sessizce yutulursa ekran veriyi gizlemiş olur.
 */
export function dayTotalText(day: TimesheetDayColumn, variant: TimesheetVariant): string {
  if (variant === "general") return String(day.workedCount);
  const overtimeMark = day.hasOvertime ? "+" : "";
  const dutyMark = day.temporaryDutyCount > 0 ? "G" : "";
  return `${day.workedCount}${overtimeMark}${dutyMark}`;
}

/**
 * Ayak satırı hücresinin renk sınıfı eki.
 *
 * `site`: ŞP 232/235/237/245 DÖRT ayrı ton (mavi · soluk · amber · yeşil).
 * `general`: E5 198/201 İKİ ton (mavi · soluk) — işaret basılmadığı gibi
 * işaret rengi de basılmaz.
 */
export function dayTotalModifier(day: TimesheetDayColumn, variant: TimesheetVariant): string {
  if (variant === "site") {
    if (day.temporaryDutyCount > 0) return "duty";
    if (day.hasOvertime) return "overtime";
  }
  return day.workedCount > 0 ? "worked" : "zero";
}
