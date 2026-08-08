import type { components } from "@/lib/api/schema";

export type PriceIndexType = components["schemas"]["PriceIndexType"];

/**
 * Fiyat farkı endeks tipinin Türkçe etiketleri — TEK kaynak.
 *
 * Kanon: `Form - Proje Oluştur.dc.html` satır 128 (proje formundaki "Endeks
 * Tipi" seçicisi). E14'ün salt-okunur "Sözleşme Koşulları" bloğu (spec §7 S3)
 * aynı alanı GÖSTERİR; etiketin iki yerde kopyalanması `SECTION_TYPE_LABELS`
 * emsalindeki drift riskini doğururdu — bu yüzden `project-form/ContractCard`
 * de bu haritadan türetir.
 */
export const PRICE_INDEX_TYPE_LABELS: Record<PriceIndexType, string> = {
  ufe: "ÜFE (Üretici Fiyatları)",
  tufe: "TÜFE",
  construction_cost: "İnşaat Maliyet Endeksi",
  fixed_coefficient: "Sabit Katsayı",
};

/** Seçici seçenekleri — sıra mockup satır 128'deki sıradır. */
export const PRICE_INDEX_OPTIONS: readonly { value: PriceIndexType; label: string }[] = (
  ["ufe", "tufe", "construction_cost", "fixed_coefficient"] as const
).map((value) => ({ value, label: PRICE_INDEX_TYPE_LABELS[value] }));

export type PaymentPeriod = components["schemas"]["PaymentPeriod"];

/**
 * Taşeron sözleşmesi hakediş periyodunun Türkçe etiketleri — TEK kaynak.
 *
 * Kanon: `Form - Sözleşme Oluştur.dc.html` satır 101 ("Aylık" · "15 Günlük" ·
 * "İş Bitiminde"); openapi `PaymentPeriod` açıklaması da bu sırayı işaret eder
 * ("FORM 101 açılır sırası"). FSO (T6) seçiciyi, TSD (T7) hem seçiciyi hem
 * salt-okunur gösterimi buradan türetir — `PRICE_INDEX_TYPE_LABELS`
 * emsalindeki drift riski böylece doğmaz.
 */
export const PAYMENT_PERIOD_LABELS: Record<PaymentPeriod, string> = {
  monthly: "Aylık",
  biweekly: "15 Günlük",
  on_completion: "İş Bitiminde",
};

/** Seçici seçenekleri — sıra mockup satır 101'deki sıradır. */
export const PAYMENT_PERIOD_OPTIONS: readonly { value: PaymentPeriod; label: string }[] = (
  ["monthly", "biweekly", "on_completion"] as const
).map((value) => ({ value, label: PAYMENT_PERIOD_LABELS[value] }));
