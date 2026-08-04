import { isoDate } from "@/components/site-diary/derive";
import { formatDayMonthShort, formatWeekdayShort } from "@/lib/format";

/**
 * Planlama ekranının hafta aritmetiği (F-PL T2) — SAF fonksiyonlar.
 *
 * TARİH ARTEFAKTI İSTİSNASI: mockup'ın "21 – 27 Temmuz 2026" başlığı (P105) ve
 * gün tarihleri (P111-117) gerçek takvimle uyuşmuyor; KOPYALANMAZLAR. Yalnız
 * BİÇİM mockup'tan alınır (gün kısaltması + "21 Tem"), değerler gerçek
 * takvimden hesaplanır.
 *
 * SAAT DİLİMİ DİSİPLİNİ: tüm aritmetik `Date.UTC` üzerinden yürür. Ham
 * `new Date("YYYY-MM-DD")` UTC yorumlanır ve yerel alanlarla (`getDate`)
 * okunursa TR'de bir gün geri kayar; yerel `Date` kurulumu ise DST günlerinde
 * 7 gün eklemeyi 6 gün 23 saate çevirir. Girdi/çıktı hep `YYYY-MM-DD`'dir.
 */

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAYS_IN_WEEK = 7;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Takvimde GERÇEKTEN var olan bir `YYYY-MM-DD` mi (2026-02-30 → false). */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** `iso` + `days` gün (negatif değer geriye gider). Ay/yıl taşması `Date`in işi. */
export function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/**
 * Verilen günün içinde bulunduğu haftanın PAZARTESİsi (backend `week_start`
 * sözleşmesi). `getUTCDay()` 0 = Pazar olduğu için Pazar 6 gün GERİ alınır —
 * Pazar, biten haftanın son günüdür.
 */
export function mondayOf(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)).getUTCDay();
  return addDaysIso(iso, weekday === 0 ? -6 : 1 - weekday);
}

/**
 * İçinde bulunulan haftanın Pazartesi'si. "Bugün" YEREL takvimden okunur
 * (`isoDate`) — kullanıcı için doğru gün odur; sonra UTC aritmetiğine girer.
 */
export function currentWeekStart(now: Date = new Date()): string {
  return mondayOf(isoDate(now));
}

/**
 * URL'deki `?week=` parametresini haftaya çevirir (sistem sınırı = doğrulama
 * sınırı): geçersiz/eksik değer sessizce İÇİNDE BULUNULAN haftaya düşer,
 * Pazartesi olmayan geçerli bir gün ise haftasına yuvarlanır (paylaşılan
 * "23 Temmuz" bağlantısı o haftayı açar).
 */
export function resolveWeekStart(param: string | null, now: Date = new Date()): string {
  if (param === null || !isIsoDate(param)) return currentWeekStart(now);
  return mondayOf(param);
}

/** Haftanın son günü (Pazar) — `SitePlanWeek.week_end` ile aynı gün. */
export function weekEndOf(weekStart: string): string {
  return addDaysIso(weekStart, DAYS_IN_WEEK - 1);
}

export interface WeekDayLabel {
  /** "Pzt" (P111) */
  weekday: string;
  /** "21 Tem" (P111) */
  dayMonth: string;
}

/** Izgara gün başlığı (P111-117). Biçim mockup'tan, değer gerçek takvimden. */
export function weekDayLabel(iso: string): WeekDayLabel {
  return { weekday: formatWeekdayShort(iso), dayMonth: formatDayMonthShort(iso) };
}

const TR_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

/**
 * Hafta aralığı başlığı (P105). Mockup YALNIZ ay içi haftayı gösteriyor
 * ("21 – 27 Temmuz 2026"); ay/yıl sınırına düşen haftalar TÜREVDİR:
 *
 *   - aynı ay + aynı yıl → "3 – 9 Ağustos 2026"  (mockup biçimi birebir)
 *   - farklı ay, aynı yıl → "31 Ağustos – 6 Eylül 2026"
 *   - farklı yıl → "29 Aralık 2025 – 4 Ocak 2026"
 *
 * Gerekçe: mockup'ın tek örneği ay adını BİR KEZ yazıyor; ay değiştiğinde tek
 * ad basmak yanlış bilgi olurdu, yıl değiştiğinde de tek yıl. Ayraç mockup'ın
 * en tiresi (–), kısa tire değil.
 */
export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const [startYear, startMonth, startDay] = weekStart.split("-").map(Number);
  const [endYear, endMonth, endDay] = weekEnd.split("-").map(Number);
  const startName = TR_MONTHS[(startMonth ?? 0) - 1];
  const endName = TR_MONTHS[(endMonth ?? 0) - 1];
  if (startName === undefined || endName === undefined) return `${weekStart} – ${weekEnd}`;

  if (startYear !== endYear) {
    return `${startDay} ${startName} ${startYear} – ${endDay} ${endName} ${endYear}`;
  }
  if (startMonth !== endMonth) {
    return `${startDay} ${startName} – ${endDay} ${endName} ${endYear}`;
  }
  return `${startDay} – ${endDay} ${endName} ${endYear}`;
}
