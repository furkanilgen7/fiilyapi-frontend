/**
 * PLN-F3.5 · `ReportDateNav`in SAF tarih biçimleyicileri.
 *
 * LİDER KAPANIŞI (F3.5 borç 1): `TR_MONTHS_SHORT`/`TR_WEEKDAYS_LONG` A
 * tarafından `lib/format.ts`ten ihraç edildi — burada ARTIK KOPYALANMAZ,
 * doğrudan import edilir (`site-diary/derive.ts`in kendi `TR_WEEKDAYS_LONG`i
 * FARKLI bir biçim üretir — "24.09.2026 Perşembe", noktalı tarih — o yüzden
 * ondan DEĞİL `lib/format`ten alınır).
 *
 * LİDER 3. tur (madde 3): tam ay adı için AYRI bir dizi GEREKMEZ —
 * `lib/format.ts`teki `formatMonthName(month)` (format.ts:265) zaten `TR_MONTHS`
 * tek kaynağından tam ay adı döner; yerel `TR_MONTHS_LONG` SİLİNDİ.
 */
import { TR_MONTHS_SHORT, TR_WEEKDAYS_LONG, formatMonthName } from "@/lib/format";

/**
 * `iso` + `days` gün (negatif = geriye). `site-planning/week.ts/addDaysIso`
 * ile AYNI mekanik (`Date.UTC` üzerinden, ay/yıl taşması `Date`in işi) —
 * çapraz-özellik bağımlılığı kurmamak için yerel kopya (bkz. dosya başı notu).
 */
export function shiftIsoDate(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  const pad2 = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/**
 * `YYYY-MM-DD` → "24 Eylül 2026 Perşembe" (GİR:92 `dateLong`, Q:210 başlık).
 * `new Date(iso)` KULLANILMAZ (UTC yorumlanır, TR saatinde gün kayar —
 * `formatDateLong`/`formatWeekdayShort`in aynı gerekçesi). Ayrıştırılamayan
 * girdi aynen döner.
 */
export function formatDayLongWithWeekday(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (year === undefined || month === undefined || day === undefined) return iso;
  const monthNumber = Number(month);
  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) return iso;
  const monthName = formatMonthName(monthNumber);
  const weekday = weekdayLong(iso);
  const datePart = `${Number(day)} ${monthName} ${year}`;
  return weekday === null ? datePart : `${datePart} ${weekday}`;
}

function weekdayLong(iso: string): string | null {
  const [year, month, day] = iso.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return TR_WEEKDAYS_LONG[date.getUTCDay()] ?? null;
}

/**
 * Hafta aralığı, KISA ay adıyla (Q:93 `wkRange` — "18–24 Eyl 2026").
 * `site-planning/week.ts`teki `formatWeekRange` TAM ay adı kullanır
 * (P105 "21 – 27 Temmuz 2026"); QURR mockup'ı kısaltılmış ister — aynı
 * ay/yıl geçiş kuralları (`formatWeekRange`in dokümantasyonundaki üç hâl),
 * yalnız ay adı kısa.
 */
export function formatWeekRangeShort(weekStart: string, weekEnd: string): string {
  const [startYear, startMonth, startDay] = weekStart.split("-").map(Number);
  const [endYear, endMonth, endDay] = weekEnd.split("-").map(Number);
  const startName = TR_MONTHS_SHORT[(startMonth ?? 0) - 1];
  const endName = TR_MONTHS_SHORT[(endMonth ?? 0) - 1];
  if (startName === undefined || endName === undefined) return `${weekStart} – ${weekEnd}`;

  if (startYear !== endYear) {
    return `${startDay} ${startName} ${startYear} – ${endDay} ${endName} ${endYear}`;
  }
  if (startMonth !== endMonth) {
    return `${startDay} ${startName} – ${endDay} ${endName} ${endYear}`;
  }
  return `${startDay}–${endDay} ${endName} ${endYear}`;
}
