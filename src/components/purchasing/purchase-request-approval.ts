/**
 * F-SA T3 · FST 156-168 "Onay Akışı" kutusunun HESAP ÇEKİRDEĞİ.
 *
 * 🔴 **NULL-EŞİK KANONU (WORKFLOW §4 · SA backend T5 bulgusu):** NULL bir
 * toplanabilir alan üzerinden hesaplanan YETKİ/EŞİK kuralında bilinmeyen
 * KÜÇÜK değil **BÜYÜK sayılır (fail-closed)**. Fiyatsız kalem toplama GİRMEZ
 * (`line_total` `null`dur, `SUM` NULL'ları yutar); eğer ekran bu durumda
 * "Patron onayı gerekmiyor" derse ₺2M'lik bir talep, tek bir fiyat kutusu boş
 * bırakılarak düşük yetkili onaycıdan geçermiş gibi GÖRÜNÜR. Backend'de bu yol
 * FİİLEN bulundu (`procurement/validation.py: lines_missing_price`), ekranın da
 * aynı yönü seçmesi ZORUNLUDUR. Adlı testi
 * `purchase-request-approval.test.ts`tedir.
 *
 * ⚠️ Bu kutu **İSTEMCİ TÜREVİDİR** (spec §1): sunucudan gelen bir alan
 * değildir, YALNIZ BİLGİLENDİRİCİDİR. Eşiği ve yetkiyi bağlayıcı biçimde
 * SUNUCU uygular (`transitions._assert_approver_level`); ekran gönderimi
 * engellemez, yalnız ne olacağını önceden söyler.
 */

import { sumDecimalStrings } from "@/lib/decimal";
import { formatAmount } from "@/lib/format";

import {
  isPurchaseRequestLinePriced,
  purchaseRequestLineTotal,
  type PurchaseRequestLineValues,
} from "./purchase-request-form-state";

/**
 * Patron onayının devreye girdiği tahmini tutar eşiği (₺).
 *
 * 🔴 **TEK KAYNAK (spec §3 K6):** hem rozet metni (FST 165 "Patron (₺500K+)")
 * hem sonuç cümlesi (FST 166) BU SABİTTEN türer. İki ayrı yere "500K" yazmak
 * yasaktır — eşik değişince biri güncellenip öbürü unutulursa ekran kendi
 * kendiyle çelişir. Testi: "eşik metni tek kaynaktan türer".
 */
export const PURCHASE_APPROVAL_THRESHOLD = 500000;

const THOUSAND = 1000;

/** "₺500K" — eşiğin insan okunur kısa gösterimi (FST 165 · 166 ortak kaynağı). */
export function purchaseApprovalThresholdLabel(): string {
  return `₺${PURCHASE_APPROVAL_THRESHOLD / THOUSAND}K`;
}

/** FST 165 — onay zincirinin son adımı. Etiket eşikten TÜRETİLİR. */
export function bossApprovalStepLabel(): string {
  return `Patron (${purchaseApprovalThresholdLabel()}+)`;
}

/**
 * `required` eşik AŞILDI · `not_required` eşik altında · `unknown` toplam
 * BİLİNMİYOR (tutarı hesaplanamayan kalem var) → fail-closed.
 */
export type PurchaseApprovalOutcome = "required" | "not_required" | "unknown";

export interface PurchaseApprovalEstimate {
  /** Tutarı BİLİNEN kalemlerin toplamı — bilinmeyenler GİRMEZ. */
  knownTotal: string;
  /** Tutarı hesaplanamayan (fiyatı ya da miktarı eksik) kalem sayısı. */
  unknownLineCount: number;
  /** Bunlardan kaçında eksik olan FİYATTIR (sunucunun engel listesiyle aynı ölçü). */
  unpricedLineCount: number;
  outcome: PurchaseApprovalOutcome;
}

/**
 * FST 166'nın hükmü. Toplam ile sonuç AYNI fonksiyondan çıkar ki ekran
 * "₺X" yazıp yanına çelişen bir hüküm basamasın.
 */
export function estimatePurchaseApproval(
  lines: readonly PurchaseRequestLineValues[],
): PurchaseApprovalEstimate {
  const totals = lines.map(purchaseRequestLineTotal);
  const knownTotal = sumDecimalStrings(
    totals.filter((total): total is string => total !== null),
  );
  const unknownLineCount = totals.filter((total) => total === null).length;
  const unpricedLineCount = lines.filter((line) => !isPurchaseRequestLinePriced(line)).length;

  if (unknownLineCount > 0) {
    // 🔴 FAIL-CLOSED: bilinmeyen tutar KÜÇÜK değil BÜYÜK sayılır.
    return { knownTotal, unknownLineCount, unpricedLineCount, outcome: "unknown" };
  }
  return {
    knownTotal,
    unknownLineCount: 0,
    unpricedLineCount: 0,
    outcome: Number(knownTotal) >= PURCHASE_APPROVAL_THRESHOLD ? "required" : "not_required",
  };
}

/**
 * FST 166'nın metni ("₺340.900 · Patron onayı gerekmiyor").
 *
 * `unknown` dalında **"gerekmiyor" YAZILMAZ** — cümle hem tutarın eksik
 * olduğunu hem de onayın gerekebileceğini AÇIKÇA söyler.
 */
export function purchaseApprovalMessage(estimate: PurchaseApprovalEstimate): string {
  const amount = `₺${formatAmount(estimate.knownTotal)}`;
  if (estimate.outcome === "unknown") {
    return `${amount} + tutarı bilinmeyen ${estimate.unknownLineCount} kalem · Patron onayı gerekebilir`;
  }
  if (estimate.outcome === "required") {
    return `${amount} · Patron onayı gerekli (${purchaseApprovalThresholdLabel()} ve üzeri)`;
  }
  return `${amount} · Patron onayı gerekmiyor`;
}

/**
 * Toplam satırının (FST 111-112 "TAHMİNİ TOPLAM") yanında basılan eksiklik
 * uyarısı — fiyatsız kalem varsa toplamın EKSİK olduğu görünür kılınır
 * (sessizce 0 saymak yasak). Eksik yoksa `null`.
 */
export function purchaseTotalIncompleteNote(
  estimate: PurchaseApprovalEstimate,
): string | null {
  if (estimate.unknownLineCount === 0) return null;
  return `Bu toplam EKSİKTİR: ${estimate.unknownLineCount} kalemin tutarı hesaplanamıyor (fiyat ya da miktar girilmemiş) ve toplama girmiyor.`;
}
