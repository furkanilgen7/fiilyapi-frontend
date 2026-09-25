import type { components } from "@/lib/api/schema";
import type { EvSettingsRead, EvSettingsSave } from "@/lib/api/models";
import type { PfBandSettings } from "@/lib/earned-value";
import { compareDecimalStrings } from "@/lib/earned-value/decimal-input";
import { formatDateDots, parseDateDots } from "@/lib/format";

/**
 * PLN-F1.4 · Ayarlar - Planlama formunun SAF katmanı: taslak modeli, doğrulama,
 * PUT gövdesi ve değişiklik sayacı. Ekran bileşenleri yalnız bunu çağırır.
 *
 * Kaynaklar: `projedesign/Ayarlar - Planlama (Ek).dc.html` (Ek) betiği
 * Ek:414-500 · backend `earned_value/settings_service.py` doğrulaması
 * (`_check_bands` · `_check_holidays` · ALL_DAYS_OFF) · şema `SettingsSave`.
 *
 * Form metni TR biçimlidir ("0,95"); PUT'a noktalı KAYIPSIZ ondalık dize gider
 * (float'a çevrilmez). Eşik KARŞILAŞTIRMASI `compareDecimalStrings` ile yapılır.
 */

export type CompositeMeasure = components["schemas"]["CompositeMeasure"];

/** Backend `date.weekday()` sırası: 0 = Pazartesi … 6 = Pazar (Ek:449 DAYS). */
export const WEEKDAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;

/** Ek:442 `changed()` bölüm adları — sayaç ve uyarı modalı bunları basar. */
export type SectionName =
  | "Takvim"
  | "Tatiller"
  | "Durum toleransı"
  | "PF bantları"
  | "Paçal metrikler";

export interface HolidayDraft {
  /** Yalnız React anahtarı — PUT'a GİTMEZ (HolidayInput `id` taşımaz, 422). */
  key: string;
  /** "15.07.2026" ya da "26.05.2026 – 30.05.2026" (Ek:144 tek metin alanı). */
  dates: string;
  note: string;
}

export interface MetricDraft {
  /** Yalnız React anahtarı — PUT'a GİTMEZ (CompositeMetricInput `id` taşımaz). */
  key: string;
  name: string;
  measure: CompositeMeasure;
  numeratorItemIds: string[];
  denominatorItemId: string;
}

export interface SettingsDraft {
  weekStartDow: number;
  weeklyOffDays: number[];
  standardDailyHours: string;
  tolerancePoints: string;
  bands: {
    daily: { redBelow: string; greenFrom: string; highAbove: string };
    weekly: { redBelow: string; greenFrom: string };
  };
  holidays: HolidayDraft[];
  metrics: MetricDraft[];
}

export interface DraftValidation {
  standardDailyHours: boolean;
  tolerancePoints: boolean;
  weeklyOffDays: boolean;
  daily: {
    redBelow: boolean;
    greenFrom: boolean;
    highAbove: boolean;
    /** Ek:430 err1 — yeşil eşiği kırmızıdan küçük. */
    greenBelowRed: boolean;
    /** Ek:430 err2 — şüpheli yüksek eşiği yeşilden küçük. */
    highBelowGreen: boolean;
  };
  weekly: { redBelow: boolean; greenFrom: boolean; greenBelowRed: boolean };
  invalidHolidayKeys: ReadonlySet<string>;
  hasErrors: boolean;
}

/* ------------------------------------------------------------ ondalık metin */

/** Şema kalıpları (`SettingsSave`): saat Numeric(4,2) · tolerans (5,2) · bant (5,3). */
const HOURS_DIGITS = { int: 2, frac: 2 } as const;
const TOLERANCE_DIGITS = { int: 3, frac: 2 } as const;
const BAND_DIGITS = { int: 2, frac: 3 } as const;
/** Ek:456 — "1–16 arası bir değer girin"; şema min 1 · max 16. */
const HOURS_MIN = "1";
const HOURS_MAX = "16";

/** Backend ondalık dizesi → form metni ("0.950" @2..3 → "0,95"). Float'a çevrilmez. */
export function formatDecimalInput(value: string, minDigits: number, maxDigits: number): string {
  const [intPart = "0", rawFrac = ""] = value.trim().split(".");
  let frac = rawFrac.slice(0, maxDigits);
  while (frac.length > minDigits && frac.endsWith("0")) frac = frac.slice(0, -1);
  frac = frac.padEnd(minDigits, "0");
  return frac.length > 0 ? `${intPart},${frac}` : intPart;
}

/** Form metni → kayıpsız ondalık dize ("0,95" → "0.95"); kalıp dışıysa `null`. */
export function parseDecimalInput(text: string, maxInt: number, maxFrac: number): string | null {
  const pattern = new RegExp(`^(\\d{1,${maxInt}})(?:[.,](\\d{1,${maxFrac}}))?$`);
  const match = pattern.exec(text.trim());
  if (match === null) return null;
  const [, intPart, frac] = match;
  return frac === undefined ? intPart : `${intPart}.${frac}`;
}

/* --------------------------------------------------------------- tatil metni */

/** Ek:416 aralık ayırıcısı "–" (en tire); elle yazılan "-" de kabul edilir. */
const RANGE_SEPARATOR = " – ";
const HOLIDAY_PATTERN = /^(\d{2}\.\d{2}\.\d{4})(?:\s*[–-]\s*(\d{2}\.\d{2}\.\d{4}))?$/;

export function parseHolidayDates(text: string): { from: string; to: string } | null {
  const match = HOLIDAY_PATTERN.exec(text.trim());
  if (match === null) return null;
  const from = parseDateDots(match[1]);
  const to = match[2] === undefined ? from : parseDateDots(match[2]);
  if (from === "" || to === "") return null;
  return { from, to };
}

export function formatHolidayDates(from: string, to: string): string {
  return from === to
    ? formatDateDots(from)
    : `${formatDateDots(from)}${RANGE_SEPARATOR}${formatDateDots(to)}`;
}

/** ISO tarih → backend hafta günü (0 = Pazartesi). */
function weekdayOfIso(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

/** Ek:457 — tek günlük tatil çalışılmayan güne düşüyorsa "Paz'a denk". */
export function holidayOffDayNote(dates: string, weeklyOffDays: readonly number[]): string {
  const parsed = parseHolidayDates(dates);
  if (parsed === null || parsed.from !== parsed.to) return "";
  const weekday = weekdayOfIso(parsed.from);
  return weeklyOffDays.includes(weekday) ? `${WEEKDAY_SHORT[weekday]}'a denk` : "";
}

/* ---------------------------------------------------------------- dönüşüm */

let keySeed = 0;
/** Yalnız istemci anahtarı üretir (liste satırı kimliği); sunucuya gitmez. */
export function nextDraftKey(prefix: string): string {
  keySeed += 1;
  return `${prefix}-${keySeed}`;
}

export function draftFromSettings(settings: EvSettingsRead): SettingsDraft {
  const { daily, weekly } = settings.pf_bands;
  return {
    weekStartDow: settings.week_start_dow,
    weeklyOffDays: [...settings.weekly_off_days].sort((a, b) => a - b),
    standardDailyHours: formatDecimalInput(settings.standard_daily_hours, 0, HOURS_DIGITS.frac),
    tolerancePoints: formatDecimalInput(settings.tolerance_points, 1, TOLERANCE_DIGITS.frac),
    bands: {
      daily: {
        redBelow: formatDecimalInput(daily.red_below, 2, BAND_DIGITS.frac),
        greenFrom: formatDecimalInput(daily.green_from, 2, BAND_DIGITS.frac),
        highAbove: formatDecimalInput(daily.high_above, 2, BAND_DIGITS.frac),
      },
      weekly: {
        redBelow: formatDecimalInput(weekly.red_below, 2, BAND_DIGITS.frac),
        greenFrom: formatDecimalInput(weekly.green_from, 2, BAND_DIGITS.frac),
      },
    },
    holidays: settings.holidays.map((holiday) => ({
      key: nextDraftKey("holiday"),
      dates: formatHolidayDates(holiday.date_from, holiday.date_to),
      note: holiday.note,
    })),
    metrics: settings.composite_metrics.map((metric) => ({
      key: nextDraftKey("metric"),
      name: metric.name,
      measure: metric.measure,
      numeratorItemIds: [...metric.numerator_item_ids],
      denominatorItemId: metric.denominator_item_id,
    })),
  };
}

/* --------------------------------------------------------------- doğrulama */

const band = (text: string) => parseDecimalInput(text, BAND_DIGITS.int, BAND_DIGITS.frac);

/** `a < b` — ikisi de geçerliyse; biri boşsa sıra hatası SAYILMAZ (alan hatası yeter). */
function isBelow(a: string | null, b: string | null): boolean {
  return a !== null && b !== null && compareDecimalStrings(a, b) < 0;
}

/** Tamamen boş satır ("Tatil ekle" ile açılıp doldurulmamış) PUT'a girmez, hata da değildir. */
function isBlankHoliday(holiday: HolidayDraft): boolean {
  return holiday.dates.trim() === "" && holiday.note.trim() === "";
}

function invalidHolidays(holidays: readonly HolidayDraft[]): Set<string> {
  const invalid = new Set<string>();
  const ranges: { key: string; from: string; to: string }[] = [];
  for (const holiday of holidays) {
    if (isBlankHoliday(holiday)) continue;
    const parsed = parseHolidayDates(holiday.dates);
    // Backend HOLIDAY_RANGE_INVALID: bitiş başlangıçtan önce olamaz.
    if (parsed === null || parsed.to < parsed.from) {
      invalid.add(holiday.key);
      continue;
    }
    ranges.push({ key: holiday.key, ...parsed });
  }
  // Backend HOLIDAY_RANGE_OVERLAP: sıralı komşular çakışmamalı.
  const ordered = [...ranges].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  ordered.forEach((current, index) => {
    const previous = ordered[index - 1];
    if (previous !== undefined && current.from <= previous.to) {
      invalid.add(previous.key);
      invalid.add(current.key);
    }
  });
  return invalid;
}

export function validateDraft(draft: SettingsDraft): DraftValidation {
  const hours = parseDecimalInput(draft.standardDailyHours, HOURS_DIGITS.int, HOURS_DIGITS.frac);
  const hoursInvalid =
    hours === null ||
    compareDecimalStrings(hours, HOURS_MIN) < 0 ||
    compareDecimalStrings(hours, HOURS_MAX) > 0;
  const tolerance = parseDecimalInput(
    draft.tolerancePoints,
    TOLERANCE_DIGITS.int,
    TOLERANCE_DIGITS.frac,
  );
  const offDaysInvalid = new Set(draft.weeklyOffDays).size >= WEEKDAY_SHORT.length;

  const dRed = band(draft.bands.daily.redBelow);
  const dGreen = band(draft.bands.daily.greenFrom);
  const dHigh = band(draft.bands.daily.highAbove);
  const wRed = band(draft.bands.weekly.redBelow);
  const wGreen = band(draft.bands.weekly.greenFrom);

  const daily = {
    redBelow: dRed === null,
    greenFrom: dGreen === null,
    highAbove: dHigh === null,
    greenBelowRed: isBelow(dGreen, dRed),
    highBelowGreen: isBelow(dHigh, dGreen),
  };
  const weekly = {
    redBelow: wRed === null,
    greenFrom: wGreen === null,
    greenBelowRed: isBelow(wGreen, wRed),
  };
  const invalidHolidayKeys = invalidHolidays(draft.holidays);

  const hasErrors =
    hoursInvalid ||
    tolerance === null ||
    offDaysInvalid ||
    Object.values(daily).some(Boolean) ||
    Object.values(weekly).some(Boolean) ||
    invalidHolidayKeys.size > 0;

  return {
    standardDailyHours: hoursInvalid,
    tolerancePoints: tolerance === null,
    weeklyOffDays: offDaysInvalid,
    daily,
    weekly,
    invalidHolidayKeys,
    hasErrors,
  };
}

/**
 * Önizleme rozeti için `pfBand()` eşikleri — KUTU BAŞINA (Ek:434-435: hatalı
 * kutu "–" basar, öteki kutu etkilenmez). `kind` kutusu hatalıysa `null`;
 * öteki kutunun alanları ayrıştırılabildiği kadarıyla taşınır (pfBand onlara
 * bakmaz — günlük rozet yalnız `daily`, haftalık yalnız `weekly` okur).
 */
export function pfBandSettingsFromDraft(
  draft: SettingsDraft,
  kind: "daily" | "weekly",
): PfBandSettings | null {
  const validation = validateDraft(draft);
  if (Object.values(validation[kind]).some(Boolean)) return null;
  return {
    daily: {
      redBelow: band(draft.bands.daily.redBelow) ?? "",
      greenFrom: band(draft.bands.daily.greenFrom) ?? "",
      highAbove: band(draft.bands.daily.highAbove) ?? "",
    },
    weekly: {
      redBelow: band(draft.bands.weekly.redBelow) ?? "",
      greenFrom: band(draft.bands.weekly.greenFrom) ?? "",
    },
  };
}

/* ------------------------------------------------------------- PUT gövdesi */

/**
 * TAM DEĞİŞTİRME gövdesi (`SettingsSave`). Çağıran önce `validateDraft` ile
 * kapıyı kapatır; burada geçersiz alan kalmışsa boş dize gider ve backend 422
 * verir — sessiz varsayılan UYDURULMAZ.
 *
 * 🔴 Tatil ve paçal satırlarında `id` GÖNDERİLMEZ: şema `additionalProperties:
 * false`dur, `id` 422 alır (B1).
 */
export function buildSavePayload(draft: SettingsDraft): EvSettingsSave {
  return {
    week_start_dow: draft.weekStartDow,
    weekly_off_days: [...new Set(draft.weeklyOffDays)].sort((a, b) => a - b),
    standard_daily_hours:
      parseDecimalInput(draft.standardDailyHours, HOURS_DIGITS.int, HOURS_DIGITS.frac) ?? "",
    tolerance_points:
      parseDecimalInput(draft.tolerancePoints, TOLERANCE_DIGITS.int, TOLERANCE_DIGITS.frac) ?? "",
    pf_bands: {
      daily: {
        red_below: band(draft.bands.daily.redBelow) ?? "",
        green_from: band(draft.bands.daily.greenFrom) ?? "",
        high_above: band(draft.bands.daily.highAbove) ?? "",
      },
      weekly: {
        red_below: band(draft.bands.weekly.redBelow) ?? "",
        green_from: band(draft.bands.weekly.greenFrom) ?? "",
      },
    },
    holidays: draft.holidays
      .filter((holiday) => !isBlankHoliday(holiday))
      .map((holiday) => {
        const parsed = parseHolidayDates(holiday.dates);
        return {
          date_from: parsed?.from ?? "",
          date_to: parsed?.to ?? "",
          note: holiday.note.trim(),
        };
      }),
    composite_metrics: draft.metrics.map((metric) => ({
      name: metric.name,
      measure: metric.measure,
      numerator_item_ids: [...metric.numeratorItemIds],
      denominator_item_id: metric.denominatorItemId,
    })),
  };
}

/* ------------------------------------------------------- değişiklik sayacı */

/** Anahtar dışı karşılaştırma (satır anahtarı istemci üretimi, değişiklik değildir). */
function holidaySignature(holidays: readonly HolidayDraft[]): string {
  return JSON.stringify(holidays.map((holiday) => [holiday.dates, holiday.note]));
}

function metricSignature(metrics: readonly MetricDraft[]): string {
  return JSON.stringify(
    metrics.map((metric) => [
      metric.name,
      metric.measure,
      metric.numeratorItemIds,
      metric.denominatorItemId,
    ]),
  );
}

function sortedDays(days: readonly number[]): string {
  return JSON.stringify([...days].sort((a, b) => a - b));
}

/** Ek:441-445 `changed()` — değişen bölüm adları, mockup sırasıyla, tekil. */
export function changedSections(baseline: SettingsDraft, draft: SettingsDraft): SectionName[] {
  const sections: SectionName[] = [];
  if (
    baseline.weekStartDow !== draft.weekStartDow ||
    baseline.standardDailyHours !== draft.standardDailyHours ||
    sortedDays(baseline.weeklyOffDays) !== sortedDays(draft.weeklyOffDays)
  ) {
    sections.push("Takvim");
  }
  if (holidaySignature(baseline.holidays) !== holidaySignature(draft.holidays)) {
    sections.push("Tatiller");
  }
  if (baseline.tolerancePoints !== draft.tolerancePoints) sections.push("Durum toleransı");
  if (JSON.stringify(baseline.bands) !== JSON.stringify(draft.bands)) sections.push("PF bantları");
  if (metricSignature(baseline.metrics) !== metricSignature(draft.metrics)) {
    sections.push("Paçal metrikler");
  }
  return sections;
}

/* ------------------------------------------------------------ hafta ipucu */

function dayMonth(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Ek:453-455 — bugünü içeren hafta, seçilen başlangıç gününe göre ("21.09–27.09"). */
export function weekRangeLabel(today: Date, weekStartDow: number): string {
  const todayDow = (today.getDay() + 6) % 7;
  const back = (todayDow - weekStartDow + 7) % 7;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
  // Gün aritmetiği takvim üzerinden: yaz saati geçişinde 24 sa ≠ 1 gün.
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return `${dayMonth(start)}–${dayMonth(end)}`;
}
