/**
 * EV (Planlama) sayı biçimleri — mockup'ların `nf`/`sgn`/`dec` yardımcılarının
 * ürün karşılığı. Hepsi `decimal-input.ts`in ROUND_HALF_UP yuvarlamasından
 * geçer; `pfBand()` da aynı yuvarlamayı kullandığı için metin ile renk
 * çelişmez (spec §3.8 K18). Boş değer ürün kanonu `EMPTY_CELL` (K20).
 *
 * Genel `lib/format.ts` biçimleyicileri burada YETMEZ: `formatDecimal` yalnız
 * `maximumFractionDigits` kullanır ("1,00" → "1"), `formatPercent` girdiyi
 * zaten yüzde sayar ve sondaki sıfırı atar ("%52,0" → "%52").
 */
import { divideDecimalStrings, multiplyDecimalStrings } from "@/lib/decimal";
import { EMPTY_CELL } from "@/lib/format";

import { roundHalfUp, toDecimalString, toPoints, type EvNumber } from "./decimal-input";

const LOCALE = "tr-TR";
const MINUS_SIGN = "−";
const PF_DIGITS = 2;
const PERCENT_DEFAULT_DIGITS = 1;
const VARIANCE_DIGITS = 1;
/** Birim oran: bu değer ve üstü 1 ondalık, altı 2 (KAT:410 `dec` · Q:318-321). */
const UNIT_RATE_WIDE_FROM = 10;
const UNIT_RATE_WIDE_DIGITS = 1;
const UNIT_RATE_NARROW_DIGITS = 2;
const MS_TO_KMH = "3.6";

/** Zaten yuvarlanmış ondalık string'i sabit basamakla tr-TR basar. */
function formatFixed(rounded: string, digits: number): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(rounded));
}

/** PF: sabit 2 ondalık — "0,97" · "1,00". */
export function formatPf(value: EvNumber): string {
  const rounded = roundHalfUp(value, PF_DIGITS);
  return rounded === null ? EMPTY_CELL : formatFixed(rounded, PF_DIGITS);
}

/** 0–1 kesir → "%45,9" (sabit `digits` ondalık, sondaki sıfır korunur). */
export function formatPercent01(value: EvNumber, digits: number = PERCENT_DEFAULT_DIGITS): string {
  const rounded = roundHalfUp(toPoints(value), digits);
  return rounded === null ? EMPTY_CELL : `%${formatFixed(rounded, digits)}`;
}

/** 0–1 sapma → işaretli puan "−2,6" · "+1,6"; yuvarlanınca sıfırsa "0,0". */
export function formatVariancePoints(value: EvNumber): string {
  const rounded = roundHalfUp(toPoints(value), VARIANCE_DIGITS);
  if (rounded === null) return EMPTY_CELL;
  const magnitude = formatFixed(rounded.replace(/^-/, ""), VARIANCE_DIGITS);
  if (Number(rounded) === 0) return magnitude;
  return `${rounded.startsWith("-") ? MINUS_SIGN : "+"}${magnitude}`;
}

/** Birim oran (a-s/birim): ≥ 10 → 1 ondalık, aksi 2. Eşik HAM değere bakar. */
export function formatUnitRate(value: EvNumber): string {
  const decimal = toDecimalString(value);
  if (decimal === null) return EMPTY_CELL;
  const isWide = Math.abs(Number(decimal)) >= UNIT_RATE_WIDE_FROM;
  const digits = isWide ? UNIT_RATE_WIDE_DIGITS : UNIT_RATE_NARROW_DIGITS;
  return formatFixed(divideDecimalStrings(decimal, "1", digits) ?? decimal, digits);
}

/** Rüzgâr m/s → "18 km/sa" (İ:707 tam sayı · K22 etiket "km/sa"). */
export function formatWindKmh(metersPerSecond: EvNumber): string {
  const decimal = toDecimalString(metersPerSecond);
  if (decimal === null) return EMPTY_CELL;
  const kmh = roundHalfUp(multiplyDecimalStrings(decimal, MS_TO_KMH), 0);
  return kmh === null ? EMPTY_CELL : `${formatFixed(kmh, 0)} km/sa`;
}
