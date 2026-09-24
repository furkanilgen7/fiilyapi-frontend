/**
 * EV (Planlama) sayılarının ORTAK girişi: backend Decimal alanları string,
 * istemci türevleri number gelebilir. İkisi de burada tek bir kayıpsız ondalık
 * string'e indirgenir; bant (`bands.ts`) ve biçim (`format.ts`) AYNI yuvarlamayı
 * buradan alır — K18 "renk ile metin hiç çelişmez" kuralının tek dayanağı budur.
 *
 * 🔴 `Math.round(v * 100) / 100` YASAK: `0.945 * 100 === 94.49999999999999`,
 * yani tam yarım AŞAĞI kayar ve ekran "0,94" yazıp bandı başka yerde "0,95"le
 * kurardı. Yuvarlama `divideDecimalStrings(x, "1", scale)` ile yapılır
 * (ROUND_HALF_UP, sıfırdan uzağa — Python `decimal`la aynı, backend paritesi).
 */
import {
  divideDecimalStrings,
  isZeroDecimalString,
  multiplyDecimalStrings,
  subtractDecimalStrings,
} from "@/lib/decimal";

export type EvNumber = string | number | null | undefined;

const DECIMAL_PATTERN = /^[-+]?(\d+\.?\d*|\.\d+)$/;
/** Üstel gösterimli number'lar (1e-7) için yedek kesir hassasiyeti. */
const EXPONENT_FALLBACK_DIGITS = 12;

/** Geçerli bir ondalık string ya da `null` (veri yok / anlamsız girdi). */
export function toDecimalString(value: EvNumber): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const text = String(value);
    return text.includes("e") ? value.toFixed(EXPONENT_FALLBACK_DIGITS) : text;
  }
  const trimmed = value.trim();
  return DECIMAL_PATTERN.test(trimmed) ? trimmed : null;
}

/** ROUND_HALF_UP ile `scale` basamağa yuvarlar: "0.9450" @2 → "0.95". */
export function roundHalfUp(value: EvNumber, scale: number): string | null {
  const decimal = toDecimalString(value);
  return decimal === null ? null : divideDecimalStrings(decimal, "1", scale);
}

/** 0–1 kesri puana/yüzdeye çevirir (×100), kayıpsız. */
export function toPoints(value: EvNumber): string | null {
  const decimal = toDecimalString(value);
  return decimal === null ? null : multiplyDecimalStrings(decimal, "100");
}

/** İki geçerli ondalık string'i kayıpsız karşılaştırır: −1 · 0 · 1. */
export function compareDecimalStrings(a: string, b: string): -1 | 0 | 1 {
  const difference = subtractDecimalStrings(a, b);
  if (isZeroDecimalString(difference)) return 0;
  return difference.startsWith("-") ? -1 : 1;
}
