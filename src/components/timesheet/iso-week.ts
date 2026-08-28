import { isoDate } from "@/components/site-diary/derive";
import { addDaysIso, mondayOf } from "@/components/site-planning/week";

/**
 * PUAN-SAAT · Puantajın ISO HAFTA aritmetiği — saf, bileşensiz.
 *
 * Uç sözleşmesi haftayı `iso_year` + `iso_week` SAYILARIYLA taşır
 * (`GET|PUT /sites/{id}/timesheet/week`), planlama ekranının `?week=<Pazartesi>`
 * biçiminden AYRIDIR. Bu yüzden burada YALNIZ sayı ↔ Pazartesi dönüşümü ile
 * doğrulama yaşar; gün aritmetiğinin kendisi `site-planning/week.ts`ten
 * yeniden kullanılır (ikinci bir `Date.UTC` kanonu yazılmaz — DRY).
 *
 * 🔴 ISO YILI TAKVİM YILI DEĞİLDİR: 1 Ocak 2027 ISO'da 2026'nın 53. haftasına
 * düşer. `year`/`month` çiftiyle karıştırılırsa yıl sınırındaki hafta
 * kaybolur.
 */

const DAYS_IN_WEEK = 7;
const THURSDAY_OFFSET = 4;

/** Uç sözleşmesinin sınırları (`/sites/{site_id}/timesheet/week`). */
export const TIMESHEET_ISO_YEAR_MIN = 2000;
export const TIMESHEET_ISO_YEAR_MAX = 2100;
export const TIMESHEET_ISO_WEEK_MIN = 1;
export const TIMESHEET_ISO_WEEK_MAX = 53;

export interface TimesheetIsoWeek {
  readonly isoYear: number;
  readonly isoWeek: number;
}

/** Pazartesi = 1 … Pazar = 7 (ISO-8601; `getUTCDay`ın 0 = Pazar'ı DEĞİL). */
function isoWeekday(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)).getUTCDay();
  return weekday === 0 ? DAYS_IN_WEEK : weekday;
}

function daysBetween(fromIso: string, toIso: string): number {
  const parse = (iso: string) => {
    const [year, month, day] = iso.split("-").map(Number);
    return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
  };
  return Math.round((parse(toIso) - parse(fromIso)) / (24 * 60 * 60 * 1000));
}

/**
 * Bir günün ISO yılı + hafta numarası.
 *
 * Kanon: haftanın PERŞEMBEsi hangi takvim yılındaysa ISO yılı odur — bu tek
 * kural yıl sınırındaki dört ayrı hâli (W52/W53/W1) birden çözer.
 */
export function isoWeekOf(iso: string): TimesheetIsoWeek {
  const thursday = addDaysIso(iso, THURSDAY_OFFSET - isoWeekday(iso));
  const isoYear = Number(thursday.slice(0, 4));
  const firstThursday = addDaysIso(
    mondayOf(`${isoYear}-01-04`),
    THURSDAY_OFFSET - 1,
  );
  return {
    isoYear,
    isoWeek: Math.floor(daysBetween(firstThursday, thursday) / DAYS_IN_WEEK) + 1,
  };
}

/**
 * ISO yıl + hafta → o haftanın PAZARTESİsi.
 *
 * ⚠️ Taşma DOĞRULANMAZ: her yılın 53. haftası yoktur ve `mondayOfIsoWeek(2025, 53)`
 * 2026-W1'e taşar. Doğrulama `parseIsoWeek`in işidir — burada matematik saf
 * kalır (çağıran ileri/geri kaydırmada kasıtlı taşma da ister).
 */
export function mondayOfIsoWeek(isoYear: number, isoWeek: number): string {
  // 4 Ocak HER ISO yılında 1. haftadadır (ISO-8601 tanımı).
  return addDaysIso(mondayOf(`${isoYear}-01-04`), (isoWeek - 1) * DAYS_IN_WEEK);
}

/** Haftanın yedi günü (Pzt→Paz) — ızgara sütunlarının ve gövdenin kapsamı. */
export function isoWeekDates(week: TimesheetIsoWeek): string[] {
  const monday = mondayOfIsoWeek(week.isoYear, week.isoWeek);
  return Array.from({ length: DAYS_IN_WEEK }, (_, index) => addDaysIso(monday, index));
}

export function currentIsoWeek(now: Date = new Date()): TimesheetIsoWeek {
  // "Bugün" YEREL takvimden okunur (kullanıcı için doğru gün odur), sonra UTC
  // aritmetiğine girer — `site-planning/week.ts` ile aynı gerekçe.
  return isoWeekOf(isoDate(now));
}

/**
 * `‹`/`›` — hafta kaydırması PAZARTESİ üzerinden yürür.
 *
 * Numarayı doğrudan artırmak yıl sınırında KIRILIR (52 → 53 olmayan yılda
 * var olmayan haftaya, 53 → 54'e giderdi).
 */
export function shiftIsoWeek(week: TimesheetIsoWeek, delta: number): TimesheetIsoWeek {
  const monday = mondayOfIsoWeek(week.isoYear, week.isoWeek);
  return isoWeekOf(addDaysIso(monday, delta * DAYS_IN_WEEK));
}

/**
 * URL'den hafta okur (`?iso_year=2026&iso_week=29`).
 *
 * Geçersiz/eksik/aralık dışı değer İÇİNDE BULUNULAN haftaya düşer — kırık bir
 * bağlantı boş ekran ÜRETMEZ (`month.ts/parsePeriod` ile aynı kural).
 *
 * 🔴 SON DENETİM: sayısal aralık YETMEZ. `2025-W53` aralık içindedir ama o yıl
 * 52 haftadır; doğrulanmazsa ekran 2026-W1'i açıp başlığında "2025 · 53. hafta"
 * yazar ve kullanıcı yanlış haftayı kaydeder. Bu yüzden çözülen Pazartesi
 * GERİYE okunur ve istenen haftayla eşleşmiyorsa bugüne düşülür.
 */
export function parseIsoWeek(
  isoYearParam: string | null,
  isoWeekParam: string | null,
  now: Date = new Date(),
): TimesheetIsoWeek {
  const fallback = currentIsoWeek(now);
  const isoYear = Number(isoYearParam);
  const isoWeek = Number(isoWeekParam);
  if (
    !Number.isInteger(isoYear) ||
    isoYear < TIMESHEET_ISO_YEAR_MIN ||
    isoYear > TIMESHEET_ISO_YEAR_MAX
  ) {
    return fallback;
  }
  if (
    !Number.isInteger(isoWeek) ||
    isoWeek < TIMESHEET_ISO_WEEK_MIN ||
    isoWeek > TIMESHEET_ISO_WEEK_MAX
  ) {
    return fallback;
  }
  const resolved = isoWeekOf(mondayOfIsoWeek(isoYear, isoWeek));
  if (resolved.isoYear !== isoYear || resolved.isoWeek !== isoWeek) return fallback;
  return resolved;
}
