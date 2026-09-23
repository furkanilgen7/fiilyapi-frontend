/**
 * HAK-NULL · şantiye/proje-geneli kapsam süzgeci (saf fonksiyon).
 *
 * KAYIT 454: bu yardımcı önceden `components/progress-payments/shared/
 * site-payment-scope.ts` altındaydı ve `lib/api/hooks/
 * useSiteSubcontractorPayments.ts` (alt katman) onu ORADAN import ediyordu —
 * `components/` (üst katman) da geri dönüp `useSiteSubcontractorPayments.ts`
 * içindeki `SiteSubcontractorPaymentItem` tipini import ettiği için DÖNGÜSEL
 * bağımlılık oluşuyordu. Saf mantık burada, `lib/` altında, KONKRE tipten
 * bağımsız (generic) yaşar; hook bu dosyadan import eder, components katmanı
 * yalnız TÜKETİR — döngü kırılır.
 *
 * Ayrım gerekçesi (HAK-NULL) — orijinal not `components/progress-payments/
 * shared/site-payment-scope.ts`te korunur (geriye dönük tip takma adı +
 * re-export barındırır).
 */
export interface SitePaymentScopeItem {
  readonly contractSiteId: string | null;
}

export interface SitePaymentScopePartition<T extends SitePaymentScopeItem> {
  /** Sözleşmesi BU şantiyeye bağlı satırlar — para toplamlarının TEK kaynağı. */
  readonly siteScoped: readonly T[];
  /**
   * Sözleşmesi PROJE GENELİ (`contractSiteId === null`) satırlar. Basılır,
   * TOPLANMAZ — her şantiyede tekrar döndükleri için.
   */
  readonly projectWide: readonly T[];
}

export function partitionSitePayments<T extends SitePaymentScopeItem>(
  items: readonly T[],
): SitePaymentScopePartition<T> {
  const siteScoped: T[] = [];
  const projectWide: T[] = [];
  for (const item of items) {
    if (item.contractSiteId === null) {
      projectWide.push(item);
    } else {
      siteScoped.push(item);
    }
  }
  return { siteScoped, projectWide };
}

/**
 * Proje geneli satırların GÖRÜNÜR notu. Sayı sıfırsa `null` — boş bir not
 * basmak gürültüdür.
 *
 * Metin "toplama girmiyor" GERÇEĞİNİ söyler: kullanıcı listede gördüğü bir
 * tutarın KPI'da neden olmadığını başka türlü anlayamazdı.
 */
export function projectWideNote(count: number): string | null {
  if (count <= 0) return null;
  return `${count} proje geneli hakediş — projenin tüm şantiyelerini kapsar, bu şantiyenin toplamına eklenmez`;
}
