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
  toDecimalString,
  type DecimalLike,
} from "@/lib/decimal";

export type EvNumber = DecimalLike;

/** Geçerli bir ondalık string ya da `null` — genel `lib/decimal`dan (PLN-F2.1). */
export { toDecimalString };

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
