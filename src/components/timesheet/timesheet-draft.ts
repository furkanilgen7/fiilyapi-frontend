import type { TimesheetCode } from "@/lib/api/hooks/useTimesheet";
import type {
  TimesheetCellInput,
  TimesheetWeekSave,
} from "@/lib/api/hooks/useTimesheetMutations";

import type { TimesheetSourcedCell } from "./week-derive";

/**
 * Puantajın YEREL TASLAK katmanı (PUAN-SAAT) — SAF veri, React yok.
 *
 * ═══ KAPSAM KURALI — BU DİLİMİN EN KRİTİK TUZAĞI ═══
 * `PUT /sites/{site_id}/timesheet/week` HAFTA + ŞANTİYE kapsamında
 * DEĞİŞTİRMEDİR: gövdede geçmeyen hücre SİLİNİR. Bu yüzden gövde, EKRANDA
 * BÖLÜM FİLTRESİ AÇIKKEN BİLE, ŞANTİYENİN O HAFTAYA AİT TAM hücre kümesidir.
 *
 * 🔴 KAPSAM AY DEĞİL HAFTADIR (uç `TimesheetWeekSave` docstring'i). Gövdeye
 * haftanın DIŞINDAN hücre koymak backend'de 422'dir; ayın öbür haftaları
 * kaydetmeden ETKİLENMEZ. Bekçi ikizleri: backend
 * `test_hafta_kaydetmek_ayin_diger_haftasina_DOKUNMAZ`, istemci tarafında
 * `SiteTimesheetView.test.tsx` kapsam testi.
 *
 * Yapısal güvence: taslak GÖRÜNÜMLE değil `allCells` ile birleşir.
 * `buildTimesheetWeekView` sunucunun SÜZGEÇSİZ tam hafta kümesini alır,
 * `mergeDraftCells` ile taslağı üzerine bindirir ve sonucu `allCells` olarak
 * verir; `buildWeekSaveBody` YALNIZ bu kümeden gövde kurar. Süzülmüş `rows`
 * kaydetme yoluna HİÇ girmez.
 */

/**
 * Hücrenin YEREL hâli — **saat XOR kod** (uç `TimesheetCellInput`).
 *
 * Puantaj gün kodundan adam-SAATE geçti: çalışılan gün artık `hours`tur, kod
 * yalnız "o gün çalışılmadı ama sebebi var" hâlini taşır (`leave` · `holiday` ·
 * `temporary_duty`). `worked`/`overtime` enum üyeleri KALKTI; fazla mesai
 * SAKLANMAZ, backend'in haftalık türevidir.
 */
export interface TimesheetDraftCell {
  readonly hours: string | null;
  readonly code: TimesheetCode | null;
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

/** Hücre GERÇEKTEN bir şey söylüyor mu (saat ya da kod)? Boşu gövdeye girmez. */
export function isEmptyCell(cell: {
  hours: string | null;
  code: TimesheetCode | null;
}): boolean {
  return cell.code === null && (cell.hours === null || cell.hours.trim().length === 0);
}

/**
 * Sunucu kümesinin ÜZERİNE taslağı bindirir — sonuç yine ŞANTİYENİN o
 * haftaya ait TAM kümesidir (bölüm süzgeci UYGULANMAZ).
 *
 * Taslakta anahtarı olan hücrenin son sözünü taslak söyler: değer varsa
 * değiştirilmiş/eklenmiş hücredir, `null` ise silinmiştir. İçi boşalmış
 * (saatsiz + kodsuz) hücre de DÜŞER — gövdede yeri yoktur.
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
    if (value === null || isEmptyCell(value)) continue; // "Temizle" → gövdeye HİÇ girmez.
    const { personnelId, workDate } = splitDraftKey(key);
    edited.push({
      personnelId,
      work_date: workDate,
      // Saat XOR kod: kod seçilince eski saat SÜRÜKLENMEZ, saat yazılınca kod düşer.
      hours: value.code === null ? value.hours : null,
      code: value.code,
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
 * `PUT .../timesheet/week` gövdesi. Girdi ZORUNLU olarak
 * `TimesheetWeekDerived.allCells`tir (sunucunun tam hafta kümesi + taslak);
 * süzülmüş `rows` ya da görünüm durumu BURAYA ASLA GİRMEZ.
 *
 * Şema `additionalProperties: false` taşır: alanlar TEK TEK yazılır, nesne
 * yayılmaz (`...cell` ile `personnelId` gibi istemci alanları gövdeye sızardı).
 * `project_id` GÖNDERİLMEZ — kapsam alanını backend şantiyeden kopyalar.
 */
export function buildWeekSaveBody(
  allCells: readonly TimesheetSourcedCell[],
): TimesheetWeekSave {
  return {
    cells: allCells
      .filter((cell) => !isEmptyCell(cell))
      .map(
        (cell): TimesheetCellInput => ({
          personnel_id: cell.personnelId,
          work_date: cell.work_date,
          hours: cell.hours,
          code: cell.code,
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

/* ── Gün saati ──────────────────────────────────────────────────────────── */

/** Backend sınırı: `0 < saat <= 24`, en fazla BİR ondalık (`TimesheetCellInput`). */
export const MAX_DAY_HOURS = 24;

export type HoursParseResult =
  | { readonly ok: true; readonly value: string | null }
  | { readonly ok: false; readonly message: string };

const HOURS_PATTERN = /^\d{1,2}(\.\d)?$/;

/**
 * Sunucudaki saati DÜZENLENEBİLİR metne çevirir.
 *
 * Backend `"9.00"` gibi iki basamaklı ondalık döndürür; alana olduğu gibi
 * yazılırsa kullanıcı hiçbir şey değiştirmeden kaydettiğinde tek ondalık
 * kuralına takılırdı. Sondaki sıfırlar atılır ve ayırıcı Türkçe klavyenin
 * virgülüne çevrilir (`parseDayHours` ikisini de kabul eder).
 */
export function dayHoursText(value: string | null): string {
  if (value === null || value.trim().length === 0) return "";
  const trimmed = value
    .trim()
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
  return trimmed.replace(".", ",");
}

/**
 * Saat kutusunun metnini gövdeye girecek ondalık STRING'e çevirir.
 *
 * Boş metin GEÇERLİDİR ve `null` döner — hücre boşaltılmış demektir (o gün
 * çalışılmadı). Sınırlar backend şemasından birebir alınır; burada eleme
 * YAPILMAZ, kullanıcı gerekçeyi ekranda görür.
 */
export function parseDayHours(raw: string): HoursParseResult {
  const text = raw.trim().replace(",", ".");
  if (text.length === 0) return { ok: true, value: null };
  if (!HOURS_PATTERN.test(text)) {
    return { ok: false, message: "Saat en fazla bir ondalık basamakla yazılır (örn. 7,5)." };
  }
  const value = Number(text);
  if (value <= 0 || value > MAX_DAY_HOURS) {
    return { ok: false, message: `Gün saati 0'dan büyük ve en çok ${MAX_DAY_HOURS} olmalı.` };
  }
  return { ok: true, value: text };
}
