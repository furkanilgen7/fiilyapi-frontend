import { normalizeDecimalInput } from "@/lib/decimal";

/**
 * F-OKROL · ONAY EŞİĞİ İSTEMCİ KORKULUĞU.
 *
 * 🔴 NEDEN VAR — SÖZLEŞME KISITLARI ÜRETİLEN TS TİPİNDE YAŞAMAZ.
 * `schema.d.ts`te `approval_threshold_try` yalnızca `number | string`tir;
 * `minimum` ve `pattern` kaybolur. `pnpm typecheck` yeşilken canlı %100 kırık
 * olabilir (bu depoda bir modül tam bu yüzden altı gün ölü kaldı).
 *
 * Kısıtlar ÖLÇÜLDÜ — kaynak `backend/app/modules/approvals/schemas.py:39`:
 * ```py
 * approval_threshold_try: Decimal = Field(ge=0, max_digits=18, decimal_places=2)
 * ```
 * `max_digits=18` + `decimal_places=2` ⇒ TAM SAYI kısmı en fazla 16 hane.
 * openapi.json'daki string dalı aynı sınırı taşır
 * (`\d{0,16}\.\d{0,2}`) ama `ge=0`ı TAŞIMAZ (`[+-]?` işaret kabul eder) —
 * yani NEGATİF bir eşik yalnız Pydantic'in `ge=0`ına takılır. Korkuluk üç
 * kısıtı da burada kurar.
 *
 * KONTROL SORUSU: "bu kapı, gerçek backend'in REDDEDECEĞİ bir isteği
 * reddediyor mu?" — evet: `-1`, `1.234`, 17 haneli tam sayı ve boş değer
 * sunucuda 422'dir ve burada da geçmez.
 */

/** `Field(max_digits=18)` — tam sayı + kesir toplam hane tavanı. */
export const APPROVAL_THRESHOLD_MAX_DIGITS = 18;

/** `Field(decimal_places=2)` — kolon `Numeric(18, 2)`. */
export const APPROVAL_THRESHOLD_DECIMAL_PLACES = 2;

/** `max_digits − decimal_places` — tam sayı kısmının hane tavanı. */
export const APPROVAL_THRESHOLD_MAX_WHOLE_DIGITS =
  APPROVAL_THRESHOLD_MAX_DIGITS - APPROVAL_THRESHOLD_DECIMAL_PLACES;

export const APPROVAL_THRESHOLD_EMPTY_REASON = "Eşik boş bırakılamaz.";
export const APPROVAL_THRESHOLD_INVALID_REASON = "Eşik yalnız rakam ve ondalık ayırıcı içerebilir.";
export const APPROVAL_THRESHOLD_NEGATIVE_REASON = "Eşik negatif olamaz.";
export const APPROVAL_THRESHOLD_DECIMALS_REASON = `Eşik en fazla ${APPROVAL_THRESHOLD_DECIMAL_PLACES} ondalık basamak taşıyabilir.`;
export const APPROVAL_THRESHOLD_TOO_LARGE_REASON = `Eşiğin tam sayı kısmı en fazla ${APPROVAL_THRESHOLD_MAX_WHOLE_DIGITS} hane olabilir.`;

export type ApprovalThresholdCheck =
  /** Sunucuya GÖNDERİLECEK ondalık string (TR virgülü noktaya çevrilmiş). */
  | { ok: true; value: string }
  | { ok: false; reason: string };

/**
 * Kullanıcının yazdığı eşiği sözleşmeye karşı denetler.
 *
 * Ayrıştırma `normalizeDecimalInput` kanonundan gelir (TR virgülü → nokta);
 * ikinci bir sayı ayrıştırıcı YAZILMAZ. `Number()`a HİÇ uğramaz: 16 haneli bir
 * eşik IEEE-754'te kuruş kaybeder.
 */
export function checkApprovalThreshold(raw: string): ApprovalThresholdCheck {
  if (raw.trim() === "") return { ok: false, reason: APPROVAL_THRESHOLD_EMPTY_REASON };

  const normalized = normalizeDecimalInput(raw);
  if (normalized === null) return { ok: false, reason: APPROVAL_THRESHOLD_INVALID_REASON };

  const signless = normalized.replace(/^\+/, "");
  if (signless.startsWith("-")) return { ok: false, reason: APPROVAL_THRESHOLD_NEGATIVE_REASON };
  // `normalizeDecimalInput` `"."` ve `"+"` gibi rakamsız girdileri geçirir.
  if (!/\d/.test(signless)) return { ok: false, reason: APPROVAL_THRESHOLD_INVALID_REASON };

  const [whole = "", fraction = ""] = signless.split(".");
  if (fraction.length > APPROVAL_THRESHOLD_DECIMAL_PLACES) {
    return { ok: false, reason: APPROVAL_THRESHOLD_DECIMALS_REASON };
  }
  // Baştaki sıfırlar `Decimal` tarafından atılır; hane sayımı da atmalıdır
  // (`00500` beş hane DEĞİL üç hanedir).
  const significantWhole = whole.replace(/^0+/, "");
  if (significantWhole.length > APPROVAL_THRESHOLD_MAX_WHOLE_DIGITS) {
    return { ok: false, reason: APPROVAL_THRESHOLD_TOO_LARGE_REASON };
  }

  return { ok: true, value: signless };
}
