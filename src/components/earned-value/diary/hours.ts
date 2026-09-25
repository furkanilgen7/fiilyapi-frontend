/**
 * PLN-F2.3 · Saat Dağıtımı saat sayıları — YÜZDE-SAAT (centi) tamsayısı.
 *
 * Hücre toplamları, satır "Kalan"ı ve 0,5 sa adımlı orantılı dağıtım burada
 * tamsayıyla yapılır: `0.1 + 0.2` gibi float kayması "Kalan ✓ 0" rozetini
 * "0,00000001" yapıp sarıya boyardı. Backend Decimal'i string gelir
 * (`"9.00"`), gövdeye yine string gider (`"8.5"`).
 *
 * Mockup: `Şantiye - Günlük Kayıt (İlerleme).dc.html` İ:588 `num` (TR virgülü)
 * · İ:589 `hs` (tamsa tam, değilse ondalık virgül).
 */
import { normalizeDecimalInput } from "@/lib/decimal";
import { roundHalfUp } from "@/lib/earned-value/decimal-input";

/** Saat × 100 — tamsayı. */
export type Centi = number;

const SCALE = 2;
const CENTI_PER_HOUR = 100;
const LOCALE = "tr-TR";
const MINUS_SIGN = "−";

/** Ondalık string'i (`"-12.5"`) tamsayı centi'ye çevirir; float'a uğramaz. */
function decimalToCenti(decimal: string): Centi {
  const negative = decimal.startsWith("-");
  const [integer = "0", fraction = ""] = decimal.replace(/^[-+]/, "").split(".");
  const cents = Number(integer || "0") * CENTI_PER_HOUR + Number(fraction.padEnd(SCALE, "0").slice(0, SCALE));
  return negative ? -cents : cents;
}

/** Backend Decimal'i → centi (ROUND_HALF_UP 2 basamak). Anlamsız değer 0. */
export function toCenti(value: string | number | null | undefined): Centi {
  const rounded = roundHalfUp(value, SCALE);
  return rounded === null ? 0 : decimalToCenti(rounded);
}

/**
 * Hücreye yazılan metin: boş → 0; TR virgülü/nokta; negatif, harf ve
 * 2'den fazla ondalık GEÇERSİZ (`null`) — sessizce yuvarlanmaz.
 */
export function parseHoursInput(raw: string): Centi | null {
  if (raw.trim() === "") return 0;
  const normalized = normalizeDecimalInput(raw);
  if (normalized === null || normalized.startsWith("-") || normalized === ".") return null;
  const fraction = normalized.split(".")[1] ?? "";
  if (fraction.length > SCALE) return null;
  return decimalToCenti(normalized);
}

/** Gövde için: `850` → `"8.5"`, `900` → `"9"`. */
export function centiToDecimal(value: Centi): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const integer = Math.floor(abs / CENTI_PER_HOUR);
  const fraction = String(abs % CENTI_PER_HOUR).padStart(SCALE, "0").replace(/0+$/, "");
  return fraction === "" ? `${sign}${integer}` : `${sign}${integer}.${fraction}`;
}

/** Ekran: tr-TR, en çok 2 ondalık, sondaki sıfırsız, eksi U+2212 ("−2,5"). */
export function formatHours(value: Centi): string {
  const text = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: SCALE }).format(
    Math.abs(value) / CENTI_PER_HOUR,
  );
  return value < 0 ? `${MINUS_SIGN}${text}` : text;
}

/**
 * Hücre metni: 0 → boş (mockup hücreleri boş çizer, "0" yazmaz). Binlik
 * ayracı YOK — "1.000" geri okunurken nokta ondalık sayılır (1 sa olurdu).
 */
export function formatHoursInput(value: Centi): string {
  if (value === 0) return "";
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: SCALE, useGrouping: false }).format(
    value / CENTI_PER_HOUR,
  );
}
