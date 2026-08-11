import type { components } from "@/lib/api/schema";

/**
 * Satır miktarının KAYNAĞI — sunucunun kalıcı damgası.
 *
 * F-P10 T2 (2026-08-11) göçü: bu damga artık İKİ tarafta da (işveren
 * `ProgressPaymentLineDetail` + taşeron `SubcontractorProgressPaymentLineRead`)
 * sunucudan gelir. Backend `PUT …/lines` gövdesinden ALMAZ, kendisi türetir
 * (`lines._stamp`: satır miktarı o dönemin günlük toplamıyla birebir mi) ve
 * dönem değişince yeniden damgalar (`restamp_for_period`).
 *
 * Sonuç: rozetin OTURUM-İÇİ (istemci) türetmesi KALKTI — form artık "günlükten
 * doldurdum" iddiasını kendisi uydurmaz, yalnız sunucunun söylediğini basar.
 * Bu yüzden kaydedilmemiş bir doldurma rozet basmaz; kaydedince sunucu damgalar.
 */
export type QuantitySource = components["schemas"]["QuantitySource"];

/** Hiç kaydedilmemiş satır/hücrenin varsayılanı. */
export const DEFAULT_QUANTITY_SOURCE: QuantitySource = "manual";

/** Rozet dallanmasının TEK karar noktası (işveren + taşeron ortak). */
export function isDiarySourced(source: QuantitySource | null | undefined): boolean {
  return source === "diary";
}
