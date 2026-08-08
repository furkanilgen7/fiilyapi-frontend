import type { TimesheetCode } from "@/lib/api/hooks/useTimesheet";
import type {
  TimesheetCellInput,
  TimesheetSave,
} from "@/lib/api/hooks/useTimesheetMutations";

import type { TimesheetSourcedCell } from "./derive";

/**
 * Puantaj matrisinin YEREL TASLAK katmanı (F-PT T3) — SAF veri, React yok.
 *
 * ═══ KAPSAM KURALI — BU DİLİMİN EN KRİTİK TUZAĞI ═══
 * `PUT /sites/{site_id}/timesheet` dönem+şantiye kapsamında DEĞİŞTİRMEDİR:
 * gövdede geçmeyen hücre SİLİNİR. Bu yüzden gövde, EKRANDA BÖLÜM FİLTRESİ
 * AÇIKKEN BİLE, ŞANTİYENİN TAM hücre kümesidir.
 *
 * Yapısal güvence (K2'nin devamı): taslak, GÖRÜNÜMLE değil `allCells` ile
 * birleşir. `buildTimesheetView` sunucunun SÜZGEÇSİZ tam kümesini alır,
 * `mergeDraftCells` ile taslağı üzerine bindirir ve sonucu `allCells` olarak
 * verir; `buildTimesheetSaveBody` YALNIZ bu kümeden gövde kurar. Süzülmüş
 * `rows` kaydetme yoluna hiç girmez — girseydi diğer bölümlerin o aya ait tüm
 * kayıtları sessizce silinirdi.
 */

export interface TimesheetDraftCell {
  readonly code: TimesheetCode;
  /** Yalnız `overtime` kodunda dolabilir; saat OPSİYONELDİR (saatsiz FM = 0 saat). */
  readonly overtimeHours: string | null;
  readonly sectionId: string | null;
}

/**
 * `personnelId|workDate` → hücre. `null` DEĞER = o hücrenin SİLİNMESİ
 * ("Temizle"); anahtarın HİÇ olmaması = sunucudaki hâline dokunulmadı.
 * Bu üçlü ayrım şart: `undefined` ile `null` aynı sayılırsa "temizle" hiç
 * kaydedilemez, sunucu hücresi geri gelirdi.
 */
export type TimesheetDraft = Readonly<Record<string, TimesheetDraftCell | null>>;

export const EMPTY_TIMESHEET_DRAFT: TimesheetDraft = {};

/** Hücrenin kimliği (personel + gün) — backend'de de kişi-gün TEKTİR. */
export function timesheetDraftKey(personnelId: string, workDate: string): string {
  return `${personnelId}|${workDate}`;
}

function splitDraftKey(key: string): { personnelId: string; workDate: string } {
  const separator = key.lastIndexOf("|");
  return { personnelId: key.slice(0, separator), workDate: key.slice(separator + 1) };
}

/**
 * Sunucu kümesinin ÜZERİNE taslağı bindirir — sonuç yine ŞANTİYENİN TAM
 * kümesidir (bölüm süzgeci UYGULANMAZ).
 *
 * Taslakta anahtarı olan hücrenin son sözünü taslak söyler: değer varsa
 * değiştirilmiş/eklenmiş hücredir, `null` ise silinmiştir.
 */
export function mergeDraftCells(
  serverCells: readonly TimesheetSourcedCell[],
  draft: TimesheetDraft,
): TimesheetSourcedCell[] {
  const untouched = serverCells.filter(
    (cell) => !Object.hasOwn(draft, timesheetDraftKey(cell.personnelId, cell.work_date)),
  );
  const edited: TimesheetSourcedCell[] = [];
  for (const [key, value] of Object.entries(draft)) {
    if (value === null) continue; // "Temizle" — hücre gövdeye HİÇ girmez, yani silinir.
    const { personnelId, workDate } = splitDraftKey(key);
    edited.push({
      personnelId,
      work_date: workDate,
      code: value.code,
      // Saat YALNIZ fazla mesaide taşınır; kod değişince eski saat SÜRÜKLENMEZ.
      overtime_hours: value.code === "overtime" ? value.overtimeHours : null,
      section_id: value.sectionId,
    });
  }
  // Sıra sabitlenir: gövde ve testler render sırasından bağımsız olsun.
  return [...untouched, ...edited].sort(
    (a, b) =>
      a.personnelId.localeCompare(b.personnelId) || a.work_date.localeCompare(b.work_date),
  );
}

/**
 * `PUT` gövdesi. Girdi ZORUNLU olarak `TimesheetDerived.allCells`tir
 * (sunucunun tam kümesi + taslak); süzülmüş `rows` ya da görünüm durumu
 * BURAYA ASLA GİRMEZ — bkz. dosya başındaki kapsam kuralı.
 *
 * Şema `additionalProperties: false` taşır: alanlar TEK TEK yazılır, nesne
 * yayılmaz (`...cell` ile `personnelId` gibi istemci alanları gövdeye sızardı).
 * `project_id` GÖNDERİLMEZ — kapsam alanını backend şantiyeden kopyalar.
 */
export function buildTimesheetSaveBody(
  allCells: readonly TimesheetSourcedCell[],
): TimesheetSave {
  return {
    cells: allCells.map(
      (cell): TimesheetCellInput => ({
        personnel_id: cell.personnelId,
        work_date: cell.work_date,
        code: cell.code,
        overtime_hours: cell.overtime_hours,
        section_id: cell.section_id,
      }),
    ),
  };
}

/**
 * Düzenlenen hücrenin `section_id`'si.
 *
 * MEVCUT hücrenin bölümü KORUNUR — aktif bölüm filtresi bir hücrenin bölümünü
 * DEĞİŞTİRMEZ (filtre yalnız görünümü süzer). Yalnız YENİ açılan hücre aktif
 * filtrenin bölümünü alır; filtre kapalıysa `null` (bölümsüz) kalır.
 */
export function resolveCellSectionId(
  allCells: readonly TimesheetSourcedCell[],
  personnelId: string,
  workDate: string,
  activeSectionId: string | null,
): string | null {
  const existing = allCells.find(
    (cell) => cell.personnelId === personnelId && cell.work_date === workDate,
  );
  return existing ? existing.section_id : activeSectionId;
}

/* ── Fazla mesai saati ──────────────────────────────────────────────────── */

/** Backend sınırı: `0 < saat <= 24`, en fazla BİR ondalık (`TimesheetCellInput`). */
export const OVERTIME_MAX_HOURS = 24;

export type OvertimeParseResult =
  | { readonly ok: true; readonly value: string | null }
  | { readonly ok: false; readonly message: string };

const OVERTIME_PATTERN = /^\d{1,2}(\.\d)?$/;

/**
 * Saat alanının metnini gövdeye girecek ondalık STRING'e çevirir.
 *
 * Boş metin GEÇERLİDİR: saat opsiyoneldir, girilmezse hücre saatsiz FM olur ve
 * FM saat toplamına 0 katar. Türkçe klavyede ondalık ayırıcı virgüldür —
 * `3,5` de kabul edilir. Sınırlar backend şemasından birebir alınır; burada
 * eleme YAPILMAZ, kullanıcı gerekçeyi ekranda görür.
 */
/**
 * Sunucudaki saati DÜZENLENEBİLİR metne çevirir.
 *
 * Backend `"3.00"` gibi iki basamaklı ondalık döndürür; alana olduğu gibi
 * yazılırsa kullanıcı hiçbir şey değiştirmeden "Uygula"ya bastığında tek
 * ondalık kuralına takılırdı. Sondaki sıfırlar atılır ve ayırıcı Türkçe
 * klavyenin virgülüne çevrilir (`parseOvertimeHours` ikisini de kabul eder).
 */
export function overtimeHoursText(value: string | null): string {
  if (value === null || value.trim().length === 0) return "";
  const trimmed = value
    .trim()
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
  return trimmed.replace(".", ",");
}

export function parseOvertimeHours(raw: string): OvertimeParseResult {
  const text = raw.trim().replace(",", ".");
  if (text.length === 0) return { ok: true, value: null };
  if (!OVERTIME_PATTERN.test(text)) {
    return { ok: false, message: "Saat en fazla bir ondalık basamakla yazılır (örn. 3,5)." };
  }
  const value = Number(text);
  if (value <= 0 || value > OVERTIME_MAX_HOURS) {
    return {
      ok: false,
      message: `Fazla mesai saati 0'dan büyük ve en çok ${OVERTIME_MAX_HOURS} olmalı.`,
    };
  }
  return { ok: true, value: text };
}
