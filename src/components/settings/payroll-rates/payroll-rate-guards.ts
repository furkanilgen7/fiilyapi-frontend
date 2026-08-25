import { normalizeDecimalInput } from "@/lib/decimal";

/**
 * F-BORORAN · BORDRO ORANI + VERGİ DİLİMİ İSTEMCİ KORKULUKLARI.
 *
 * 🔴 NEDEN VAR — SÖZLEŞME KISITLARI ÜRETİLEN TS TİPİNDE YAŞAMAZ.
 * `schema.d.ts`te oran alanları yalnızca `number | string`tir; `minimum`,
 * `maximum`, `exclusiveMinimum`, `pattern` (yani `max_digits`/`decimal_places`)
 * ve setin BÜTÜNLÜK kuralları orada İFADE EDİLEMEZ. `pnpm typecheck` yeşilken
 * canlı %100 kırık olabilir — bu depoda bir modül tam bu yüzden altı gün ölü
 * kaldı (`approval-threshold.ts` kardeşi).
 *
 * KISITLAR ÖLÇÜLDÜ (kaynak: `openapi/openapi.json`, backend
 * `payroll/schemas.py` + `payroll/income_tax.py::normalize_brackets`):
 *
 * | Alan | Sözleşme |
 * |---|---|
 * | `*_pct` | `number`: `0 ≤ v ≤ 100` · `string`: `\d{0,3}(\.\d{0,3})?` |
 * | `income_tax_pct` | AYNI + `null` SERBEST (dilimli rejim, `models.py:367`) |
 * | `upper_bound` | `number`: `exclusiveMinimum 0` · `string`: `\d{0,12}(\.\d{0,2})?` · `null` yalnız SON dilimde |
 * | `ordinal` | `minimum 1`, sette 1..N ARALIKSIZ |
 * | `brackets` | `minItems 1` |
 *
 * KONTROL SORUSU (WORKFLOW §4): *"bu kapı, gerçek backend'in REDDEDECEĞİ bir
 * isteği reddediyor mu?"* — evet: `-1`, `101`, `1.2345`, dört haneli tam sayı,
 * `0` üst sınır, azalan sınır dizisi, ortada `null` sınır ve sınırlı SON dilim
 * sunucuda 422'dir ve burada da geçmez. Aksi hâlde korkuluk *onaylayıcıdır,
 * bekçi değil.*
 */

/** `Field(max_digits=6, decimal_places=3)` — oran sütunlarının hane tavanı. */
export const RATE_PCT_DECIMAL_PLACES = 3;
/** `le=100` — yüzde tavanı; `max_digits − decimal_places` ile de uyumlu (3 hane). */
export const RATE_PCT_MAX = 100;

/** `Field(max_digits=14, decimal_places=2)` — dilim sınırının hane tavanı. */
export const BRACKET_BOUND_DECIMAL_PLACES = 2;
/** `max_digits − decimal_places` — tam sayı kısmının hane tavanı. */
export const BRACKET_BOUND_MAX_WHOLE_DIGITS = 12;

export const RATE_EMPTY_REASON = "Oran boş bırakılamaz.";
export const RATE_INVALID_REASON = "Oran yalnız rakam ve ondalık ayırıcı içerebilir.";
export const RATE_NEGATIVE_REASON = "Oran negatif olamaz.";
export const RATE_TOO_LARGE_REASON = `Oran en fazla ${RATE_PCT_MAX} olabilir.`;
export const RATE_DECIMALS_REASON = `Oran en fazla ${RATE_PCT_DECIMAL_PLACES} ondalık basamak taşıyabilir.`;

export const BOUND_EMPTY_REASON = "Üst sınır boş bırakılamaz.";
export const BOUND_INVALID_REASON = "Üst sınır yalnız rakam ve ondalık ayırıcı içerebilir.";
export const BOUND_NOT_POSITIVE_REASON = "Üst sınır sıfırdan büyük olmalıdır.";
export const BOUND_TOO_LARGE_REASON = `Üst sınırın tam sayı kısmı en fazla ${BRACKET_BOUND_MAX_WHOLE_DIGITS} hane olabilir.`;
export const BOUND_DECIMALS_REASON = `Üst sınır en fazla ${BRACKET_BOUND_DECIMAL_PLACES} ondalık basamak taşıyabilir.`;

export const BRACKET_SET_EMPTY_REASON = "Tarife en az bir dilim içermelidir.";
export const BRACKET_SET_LAST_BOUNDED_REASON =
  "Son dilimin üst sınırı olmamalıdır: sınırın üstündeki matrah vergisiz kalırdı.";
export const BRACKET_SET_NOT_INCREASING_REASON =
  "Üst sınırlar artan olmalıdır: aynı matrah iki dilime düşerdi.";

export type DecimalCheck = { ok: true; value: string } | { ok: false; reason: string };

interface DecimalLimits {
  decimalPlaces: number;
  maxWholeDigits: number;
  /** Üst sınır (dahil). `undefined` ise tavan yalnız hane sayısıyla sınırlıdır. */
  max?: number;
  /** `true` ise sıfır REDDEDİLİR (`exclusiveMinimum: 0`). */
  positiveOnly?: boolean;
  reasons: {
    empty: string;
    invalid: string;
    negative: string;
    tooLarge: string;
    decimals: string;
  };
}

/**
 * Ortak ondalık kapısı — `Number()`a UĞRAMAZ (hane sayımı ve kesir uzunluğu
 * metin üzerinden ölçülür). Tek istisna `max` karşılaştırmasıdır: yüzde tavanı
 * 100'dür ve üç haneli bir sayı IEEE-754'te kayıpsızdır.
 */
function checkDecimal(raw: string, limits: DecimalLimits): DecimalCheck {
  if (raw.trim() === "") return { ok: false, reason: limits.reasons.empty };

  const normalized = normalizeDecimalInput(raw);
  if (normalized === null) return { ok: false, reason: limits.reasons.invalid };

  const signless = normalized.replace(/^\+/, "");
  if (signless.startsWith("-")) return { ok: false, reason: limits.reasons.negative };
  // `normalizeDecimalInput` `"."` gibi rakamsız girdileri GEÇİRİR.
  if (!/\d/.test(signless)) return { ok: false, reason: limits.reasons.invalid };

  const [whole = "", fraction = ""] = signless.split(".");
  if (fraction.length > limits.decimalPlaces) {
    return { ok: false, reason: limits.reasons.decimals };
  }
  // Baştaki sıfırlar `Decimal` tarafından atılır; hane sayımı da atmalıdır.
  const significantWhole = whole.replace(/^0+/, "");
  if (significantWhole.length > limits.maxWholeDigits) {
    return { ok: false, reason: limits.reasons.tooLarge };
  }
  if (limits.max !== undefined && Number(signless) > limits.max) {
    return { ok: false, reason: limits.reasons.tooLarge };
  }
  if (limits.positiveOnly === true && Number(signless) === 0) {
    return { ok: false, reason: limits.reasons.negative };
  }

  return { ok: true, value: signless };
}

/** Bir yüzde alanı (`sgk_employee_pct` … `short_work_pct`). */
export function checkRatePct(raw: string): DecimalCheck {
  return checkDecimal(raw, {
    decimalPlaces: RATE_PCT_DECIMAL_PLACES,
    maxWholeDigits: 3,
    max: RATE_PCT_MAX,
    reasons: {
      empty: RATE_EMPTY_REASON,
      invalid: RATE_INVALID_REASON,
      negative: RATE_NEGATIVE_REASON,
      tooLarge: RATE_TOO_LARGE_REASON,
      decimals: RATE_DECIMALS_REASON,
    },
  });
}

/** Bir dilim üst sınırı — `exclusiveMinimum: 0` yüzünden `0` REDDEDİLİR. */
export function checkBracketBound(raw: string): DecimalCheck {
  return checkDecimal(raw, {
    decimalPlaces: BRACKET_BOUND_DECIMAL_PLACES,
    maxWholeDigits: BRACKET_BOUND_MAX_WHOLE_DIGITS,
    positiveOnly: true,
    reasons: {
      empty: BOUND_EMPTY_REASON,
      invalid: BOUND_INVALID_REASON,
      negative: BOUND_NOT_POSITIVE_REASON,
      tooLarge: BOUND_TOO_LARGE_REASON,
      decimals: BOUND_DECIMALS_REASON,
    },
  });
}

/** Ekrandaki bir dilim satırı — `upperBound` boş string = "sınırsız". */
export interface BracketDraft {
  /** Satırın kararlı kimliği (React anahtarı); gövdeye GİTMEZ. */
  key: string;
  /** Boş string ⇒ `upper_bound: null` (yalnız SON dilimde geçerli). */
  upperBound: string;
  ratePct: string;
}

export interface BracketSetItem {
  ordinal: number;
  upper_bound: string | null;
  rate_pct: string;
}

export type BracketSetCheck =
  | { ok: true; items: BracketSetItem[] }
  /** `index` `null` ise hata SETİN BÜTÜNÜNE aittir, tek satıra değil. */
  | { ok: false; index: number | null; reason: string };

/**
 * Tüm tarifeyi sözleşmeye karşı denetler.
 *
 * 🔴 `normalize_brackets`in BEŞ kuralını AYNEN uygular (`income_tax.py:90`).
 * `ordinal` ekranda üretilir (satır sırası), bu yüzden "1..N aralıksız" kuralı
 * yapısal olarak sağlanır ve burada tekrar sınanmaz — ama SON dilimin sınırsız
 * olması ve sınırların KESİN ARTAN olması sağlanmaz, ikisi de burada denetlenir.
 */
/** Ondalık metni KURUŞ tamsayısına çevirir (kayıpsız karşılaştırma için). */
function boundAsCents(value: string): bigint {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole || "0") * 100n + BigInt(`${fraction}00`.slice(0, 2));
}

export function checkBracketSet(drafts: readonly BracketDraft[]): BracketSetCheck {
  if (drafts.length === 0) return { ok: false, index: null, reason: BRACKET_SET_EMPTY_REASON };

  const items: BracketSetItem[] = [];
  let previous: bigint | null = null;

  for (const [index, draft] of drafts.entries()) {
    const isLast = index === drafts.length - 1;
    const rate = checkRatePct(draft.ratePct);
    if (!rate.ok) return { ok: false, index, reason: rate.reason };

    if (draft.upperBound.trim() === "") {
      // Kural 4 + 5: `null` yalnız SON dilimde olabilir.
      if (!isLast) {
        return {
          ok: false,
          index,
          reason: `${index + 1}. dilimin üst sınırı yok ama son dilim değil: sonraki dilimler erişilemez olurdu.`,
        };
      }
      items.push({ ordinal: index + 1, upper_bound: null, rate_pct: rate.value });
      continue;
    }

    if (isLast) return { ok: false, index, reason: BRACKET_SET_LAST_BOUNDED_REASON };

    const bound = checkBracketBound(draft.upperBound);
    if (!bound.ok) return { ok: false, index, reason: bound.reason };
    // Kural 3: sonlu sınırlar KESİN ARTAN. Karşılaştırma `Number()` ile
    // YAPILMAZ: 12 haneli bir sınır + kuruş, IEEE-754'te tam durmaz ve iki
    // komşu sınır aynı double'a düşerse "artan" kuralı sessizce geçerdi.
    const numeric = boundAsCents(bound.value);
    if (previous !== null && numeric <= previous) {
      return { ok: false, index, reason: BRACKET_SET_NOT_INCREASING_REASON };
    }
    previous = numeric;
    items.push({ ordinal: index + 1, upper_bound: bound.value, rate_pct: rate.value });
  }

  return { ok: true, items };
}
