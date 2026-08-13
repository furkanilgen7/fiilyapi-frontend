/**
 * Hakediş gövdesinin DÖNEM parçası — işveren (`ProgressPaymentForm`) ve taşeron
 * (`SubcontractorProgressPaymentForm`) formlarının ORTAK yardımcısı.
 *
 * Neden ayrı bir modül: iki form da yaprak bir yardımcıya bağlanır, birbirine
 * DEĞİL. İşveren formundan import etmek, taşeron formunu bir `"use client"`
 * kardeş EKRANA (ve onun CSS yan-etkili import'larına + veri hook'larına)
 * bağlardı — üç satırlık saf bir fonksiyon için yanlış bağ yönü.
 */

/**
 * PATCH gövdesinden ATLANABİLİR dönem alanları. Serbest `string[]` DEĞİL:
 * yanlış yazılmış bir alan adı derlemede yakalanmalı, sessizce yutulmamalı.
 */
export type OmittablePeriodField = "period_year" | "period_month";

/**
 * Gövdenin dönem parçası. `omitFields` TİP-KİLİTLİDİR (`OmittablePeriodField`):
 * serbest bir `string[]` yanlış yazılmış alan adını sessizce yutar, bu imza
 * yutmaz. Atlanan anahtar gövdeye HİÇ basılmaz — `null` gönderilmez, çünkü
 * `null` da sunucudaki değeri EZERDİ; sözleşme (`ProgressPaymentUpdate` ·
 * `SubcontractorProgressPaymentUpdate`) iki alanı da `required` saymaz,
 * anahtar yoksa sunucu mevcut değeri korur.
 */
export function periodFields(
  periodYear: number | null,
  periodMonth: number | null,
  omitFields: readonly OmittablePeriodField[],
): { period_year?: number | null; period_month?: number | null } {
  return {
    ...(omitFields.includes("period_year") ? {} : { period_year: periodYear }),
    ...(omitFields.includes("period_month") ? {} : { period_month: periodMonth }),
  };
}
