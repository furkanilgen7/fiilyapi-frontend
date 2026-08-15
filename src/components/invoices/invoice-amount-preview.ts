import { normalizeDecimalInput } from "@/lib/decimal";

import type { InvoiceLineDraft } from "./invoice-line-math";

/**
 * F-FAT2 · FK:246-250 "Fatura Özeti" ÖNİZLEMESİ.
 *
 * 🔴 KAYNAK — bu dosya bir tahmin DEĞİL, bir PORT'tur. Kanonik formül
 * `backend/app/modules/invoicing/amounts.py` içindedir; buradaki her adım o
 * dosyanın satırlarına karşılık gelir:
 *
 *   1. subtotal           = Σ round(quantity × unit_price)   (amounts.py:157-158)
 *   2. advance_amount     = round(subtotal × advance_rate   / 100)  (:161)
 *   3. retention_amount   = round(subtotal × retention_rate / 100)  (:162)
 *   4. tax_base           = subtotal − advance − retention          (:165)
 *   5. vat_amount         = Σ_oran round(oran_matrahı × oran / 100) (:168-169, :208-235)
 *   6. withholding_amount = round(vat_amount × withholding_rate/100)(:172)
 *   7. total              = tax_base + vat_amount − withholding     (:175)
 *
 * SIRA ÜSLUP DEĞİLDİR (amounts.py:14-16): kesintilerin matrahı `subtotal`,
 * KDV'nin matrahı `tax_base`, tevkifatın matrahı `vat_amount`tır.
 *
 * 🔴 ÖNİZLEME OTORİTE DEĞİLDİR. Kaydedilen tutarları SUNUCU hesaplar; bu ekran
 * yalnız kullanıcı "Kaydet"e basmadan önce ne olacağını gösterir. Ekranda bu
 * açıkça yazılıdır (`REASONS.previewOnly`).
 *
 * 🔴 KAYAN NOKTA YOK. Backend `Decimal` kullanır ve `float`ı AST düzeyinde
 * yasaklar (`test_amounts_modulunde_kayan_nokta_YOK`). JavaScript'te `Decimal`
 * yoktur ve `0.1 + 0.2 !== 0.3`; bu yüzden tüm ara değerler TAM SAYI KURUŞ
 * (`bigint`) olarak taşınır ve her bölme `divRoundHalfUp` / `bigint /`
 * (= ROUND_DOWN) ile kesin yapılır. Modülde tek bir `Number` aritmetiği
 * yoktur — `Number(...)` yalnız `bigint`i dizi indeksine çevirmek için geçer.
 */

/** Para ölçeği — backend `Numeric(18, 2)` kolonlarıyla birebir (amounts.py:80). */
const KURUS_SCALE = 2;
const YUZ = 100n;

/** Ondalık bir sayının TAM gösterimi: `value / 10^scale`. */
interface Scaled {
  readonly value: bigint;
  readonly scale: number;
}

function pow10(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

/** Kullanıcı metnini kesin ondalığa çevirir; okunamayan girdi `null` döner. */
function parseScaled(raw: string): Scaled | null {
  const normalized = normalizeDecimalInput(raw);
  if (normalized === null) return null;
  const negative = normalized.startsWith("-");
  const unsigned = normalized.replace(/^[-+]/, "");
  const [intPart = "", fractionPart = ""] = unsigned.split(".");
  const digits = `${intPart}${fractionPart}`;
  if (digits.length === 0) return null;
  const magnitude = BigInt(digits);
  return { value: negative ? -magnitude : magnitude, scale: fractionPart.length };
}

/**
 * `ROUND_HALF_UP` bölme — eşitlikte SIFIRDAN UZAĞA (Python `decimal`in
 * ROUND_HALF_UP'ı, amounts.py:86-90).
 *
 * ⚠️ `Math.round` DEĞİL: `Math.round(-0.5) === -0` (sıfıra doğru), HALF_UP ise
 * −1 verir. Bankacı yuvarlaması (HALF_EVEN) da değildir — 0,005 → 0,01.
 */
function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n !== denominator < 0n;
  const absNumerator = numerator < 0n ? -numerator : numerator;
  const absDenominator = denominator < 0n ? -denominator : denominator;
  const quotient = absNumerator / absDenominator;
  const remainder = absNumerator % absDenominator;
  const rounded = remainder * 2n >= absDenominator ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

/** Ondalığı 2 haneye `ROUND_HALF_UP` yuvarlar, KURUŞ tamsayısı döner. */
function roundMoney(amount: Scaled): bigint {
  if (amount.scale <= KURUS_SCALE) return amount.value * pow10(KURUS_SCALE - amount.scale);
  return divRoundHalfUp(amount.value, pow10(amount.scale - KURUS_SCALE));
}

/** 1. adımın satır ayağı: `round(quantity × unit_price)` (amounts.py:134-140). */
function lineTotalKurus(quantity: Scaled, unitPrice: Scaled): bigint {
  return roundMoney({
    value: quantity.value * unitPrice.value,
    scale: quantity.scale + unitPrice.scale,
  });
}

/** `round(taban × oran / 100)` (amounts.py:202-205). Oran yoksa 0. */
function rateAmountKurus(baseKurus: bigint, rate: Scaled | null): bigint {
  if (rate === null) return 0n;
  return divRoundHalfUp(baseKurus * rate.value, YUZ * pow10(rate.scale));
}

/**
 * Bir toplamı ağırlıklara ORANTILI böler; payların toplamı toplama BİREBİR
 * eşittir (En Büyük Kalan — amounts.py:238-259).
 *
 * Ağırlık toplamı 0 ise SIFIRA BÖLMEDEN sıfır paylar döner (amounts.py:245-247).
 */
function distributeKurus(totalKurus: bigint, weightsKurus: readonly bigint[]): bigint[] {
  const weightSum = weightsKurus.reduce((sum, weight) => sum + weight, 0n);
  if (weightSum === 0n) return weightsKurus.map(() => 0n);

  // `bigint /` sıfıra doğru keser = Decimal'in ROUND_DOWN'ı (amounts.py:250).
  const shares = weightsKurus.map((weight) => (totalKurus * weight) / weightSum);
  const remainder = totalKurus - shares.reduce((sum, share) => sum + share, 0n);
  if (remainder <= 0n) return shares;

  // Sıralama anahtarı `pay − ideal`in ORTAK PAYDALI hâli: en büyük kesirli
  // kalan önce, eşitlikte küçük indeks (amounts.py:255).
  const order = shares
    .map((share, index) => ({
      index,
      key: share * weightSum - totalKurus * weightsKurus[index]!,
    }))
    .sort((a, b) => {
      if (a.key !== b.key) return a.key < b.key ? -1 : 1;
      return a.index - b.index;
    });

  const distributed = [...shares];
  for (const { index } of order.slice(0, Number(remainder))) {
    distributed[index] = distributed[index]! + 1n;
  }
  return distributed;
}

/** KURUŞ tamsayısını `"1234.56"` ondalık metnine çevirir (gösterim/karşılaştırma). */
function formatKurus(kurus: bigint): string {
  const negative = kurus < 0n;
  const magnitude = negative ? -kurus : kurus;
  const digits = magnitude.toString().padStart(KURUS_SCALE + 1, "0");
  const intPart = digits.slice(0, digits.length - KURUS_SCALE);
  const fractionPart = digits.slice(digits.length - KURUS_SCALE);
  return `${negative ? "-" : ""}${intPart}.${fractionPart}`;
}

/** Oran gruplama anahtarı — `20`, `20.0` ve `20.00` AYNI gruptur (Python'da
 * `Decimal("20") == Decimal("20.0")` ve hash'leri eşittir, amounts.py:222). */
function rateKey(rate: Scaled): string {
  return (rate.value * pow10(RATE_KEY_SCALE) / pow10(rate.scale)).toString();
}

/** Oran anahtarının ortak ölçeği — `Numeric(5, 2)` kolonundan fazlasıyla geniş. */
const RATE_KEY_SCALE = 6;

/** Hesaba giren TEK kalem — üç alanı da çözülmüş hâlde. */
interface ResolvedLine {
  readonly totalKurus: bigint;
  readonly vatRate: Scaled;
}

export interface AmountPreview {
  /** FK:246 "Mal/Hizmet Toplamı". */
  readonly subtotal: string;
  readonly advanceAmount: string;
  readonly retentionAmount: string;
  /** FK:247 "Kesintiler" — avans + teminat (tevkifat DEĞİL; o KDV üzerinden). */
  readonly deductionTotal: string;
  /** FK:248 "Vergi Matrahı". */
  readonly taxBase: string;
  /** FK:249 "KDV". */
  readonly vatAmount: string;
  readonly withholdingAmount: string;
  /** FK:250 "Fatura Toplamı". */
  readonly total: string;
  /** Faturadaki TEKİL KDV oranları (mockup FK:249 başlığı tek oran yazar). */
  readonly vatRates: readonly string[];
  /** Çözülebilen satırların kırılımı — başlığa kuruşu kuruşuna toplanır. */
  readonly lineTotals: readonly string[];
  readonly lineTaxBases: readonly string[];
  readonly lineVatAmounts: readonly string[];
}

export type AmountPreviewResult =
  | {
      readonly ok: true;
      readonly preview: AmountPreview;
      /** Tutarı ÇÖZÜLEMEYEN satır sayısı — sıfır değilse önizleme EKSİKTİR. */
      readonly unknownCount: number;
    }
  | { readonly ok: false; readonly reason: string };

export interface AmountPreviewInput {
  readonly lines: readonly InvoiceLineDraft[];
  /** `null` = kesinti İŞARETLENMEMİŞ (amounts.py:152-154) — tutarı 0'dır. */
  readonly advanceRate: string | null;
  readonly retentionRate: string | null;
  readonly withholdingRate: string | null;
}

function parseRate(raw: string | null, label: string): Scaled | null | { reason: string } {
  if (raw === null) return null;
  const parsed = parseScaled(raw);
  if (parsed === null) return { reason: `${label} oranı okunamadı.` };
  if (parsed.value < 0n) return { reason: `${label} oranı negatif olamaz.` };
  if (parsed.value > pow10(parsed.scale) * YUZ) {
    return { reason: `${label} oranı %100'ü aşamaz.` };
  }
  return parsed;
}

/**
 * FK:246-250 önizlemesi — `amounts.py:143-188`in yedi adımı, AYNI SIRAYLA.
 *
 * Çözülemeyen satır sessizce `0` sayılmaz, `unknownCount` ile SAYILIR; ekran
 * toplamın eksik olduğunu söyler.
 */
export function computeAmountPreview(input: AmountPreviewInput): AmountPreviewResult {
  const advanceRate = parseRate(input.advanceRate, "Avans kesintisi");
  if (advanceRate !== null && "reason" in advanceRate) return { ok: false, reason: advanceRate.reason };
  const retentionRate = parseRate(input.retentionRate, "Teminat kesintisi");
  if (retentionRate !== null && "reason" in retentionRate)
    return { ok: false, reason: retentionRate.reason };
  const withholdingRate = parseRate(input.withholdingRate, "KDV tevkifatı");
  if (withholdingRate !== null && "reason" in withholdingRate)
    return { ok: false, reason: withholdingRate.reason };

  const resolved: ResolvedLine[] = [];
  let unknownCount = 0;
  for (const line of input.lines) {
    const quantity = parseScaled(line.quantity);
    const unitPrice = parseScaled(line.unitPrice);
    const vatRate = parseScaled(line.vatRate);
    if (quantity === null || unitPrice === null || vatRate === null || vatRate.value < 0n) {
      unknownCount += 1;
      continue;
    }
    resolved.push({ totalKurus: lineTotalKurus(quantity, unitPrice), vatRate });
  }

  // 1
  const lineTotals = resolved.map((line) => line.totalKurus);
  const subtotal = lineTotals.reduce((sum, total) => sum + total, 0n);

  // 2 · 3
  const advanceAmount = rateAmountKurus(subtotal, advanceRate);
  const retentionAmount = rateAmountKurus(subtotal, retentionRate);

  // 4 — matrah NEGATİF olamaz; backend bunu `validation.body_blockers` ile 422
  // yapar (amounts.py:61-63). Önizleme uydurma sayı basmaz, gerekçe döner.
  const taxBase = subtotal - advanceAmount - retentionAmount;
  if (taxBase < 0n) {
    return { ok: false, reason: "Avans ve teminat kesintileri mal/hizmet toplamını aşıyor." };
  }

  // 5 — matrah satırlara ORANTILI dağıtılır, KDV oran GRUPLARINDA hesaplanır.
  const lineTaxBases = distributeKurus(taxBase, lineTotals);
  const lineVatAmounts = lineTotals.map(() => 0n);
  const groups = new Map<string, { rate: Scaled; indexes: number[] }>();
  for (const [index, line] of resolved.entries()) {
    const key = rateKey(line.vatRate);
    const group = groups.get(key);
    if (group === undefined) groups.set(key, { rate: line.vatRate, indexes: [index] });
    else group.indexes.push(index);
  }

  let vatAmount = 0n;
  for (const group of groups.values()) {
    const groupBase = group.indexes.reduce((sum, index) => sum + lineTaxBases[index]!, 0n);
    const groupVat = rateAmountKurus(groupBase, group.rate);
    vatAmount += groupVat;
    const groupShares = distributeKurus(
      groupVat,
      group.indexes.map((index) => lineTotals[index]!),
    );
    for (const [position, index] of group.indexes.entries()) {
      lineVatAmounts[index] = groupShares[position]!;
    }
  }

  // 6 · 7 — tevkifatın matrahı KDV'dir ve toplamdan DÜŞÜLÜR (K4).
  const withholdingAmount = rateAmountKurus(vatAmount, withholdingRate);
  const total = taxBase + vatAmount - withholdingAmount;

  return {
    ok: true,
    unknownCount,
    preview: {
      subtotal: formatKurus(subtotal),
      advanceAmount: formatKurus(advanceAmount),
      retentionAmount: formatKurus(retentionAmount),
      deductionTotal: formatKurus(advanceAmount + retentionAmount),
      taxBase: formatKurus(taxBase),
      vatAmount: formatKurus(vatAmount),
      withholdingAmount: formatKurus(withholdingAmount),
      total: formatKurus(total),
      vatRates: [...groups.values()].map((group) => trimRate(group.rate)),
      lineTotals: lineTotals.map(formatKurus),
      lineTaxBases: lineTaxBases.map(formatKurus),
      lineVatAmounts: lineVatAmounts.map(formatKurus),
    },
  };
}

/** `20.00` → `20` · `18.50` → `18.5` (FK:249 "KDV (%20)" başlığı için). */
function trimRate(rate: Scaled): string {
  const negative = rate.value < 0n;
  const magnitude = (negative ? -rate.value : rate.value).toString().padStart(rate.scale + 1, "0");
  const intPart = magnitude.slice(0, magnitude.length - rate.scale) || "0";
  const fractionPart = magnitude.slice(magnitude.length - rate.scale).replace(/0+$/, "");
  return `${negative ? "-" : ""}${intPart}${fractionPart.length > 0 ? `.${fractionPart}` : ""}`;
}
