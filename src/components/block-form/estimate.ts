/**
 * F-UNIT1 T1 · BE 88-93 "Tahmini Toplam Ünite" paneli — SAF türev.
 *
 * 🔴 SUNUCUYLA BİREBİR AYNI KURAL. Aynı hesap sunucuda `BlockResponse`
 * üzerinde `estimated_unit_count` adlı computed field olarak ZATEN vardır
 * (`backend/app/modules/units/schemas.py`):
 *
 *     if floor_count is None and units_per_floor is None and shop_count is None:
 *         return None
 *     return (floor_count or 0) * (units_per_floor or 0) + (shop_count or 0)
 *
 * ve sunucunun gerekçesi bağlayıcıdır: *"Uc girdi de bossa None doner — 0
 * 'hesaplandi ve sifir' der ve bu yanlis bilgidir."* İstemcinin canlı önizlemesi
 * farklı davranırsa kullanıcı formda BİR sayı, kaydettiği blokta BAŞKA bir sayı
 * görür. Bu yüzden:
 *
 * - üç girdinin ÜÇÜ de boşsa → `null` (panel "—" basar, "0" DEĞİL)
 * - biri bile doluysa → kalanlar 0 sayılarak hesaplanır
 *
 * 🔴 `basement_floor_count` (BE 78) FORMÜLDE YOKTUR. Kanıt mockup'ın kendi alt
 * yazısıdır (BE 91): bodrum 2 iken metin "8 kat × 3 daire + 2 dükkan" der ve
 * sonuç 8×3+2 = 26'dır (BE 93) — bodrum hiçbir yerde geçmez.
 *
 * 🔴 Alt yazı SABİT DEĞİLDİR: mockup'taki "8 kat × 3 daire + 2 dükkan" cümlesi
 * O ANKİ girdileri yeniden yazar. Kopyalanıp sabitlenirse kullanıcı 12 kat
 * yazdığında ekran hâlâ "8 kat" der.
 */

import type { BlockFormValues } from "./form-state";

export interface BlockEstimate {
  /** Tahmini ünite adedi; üç girdi de boşken **null** (sunucu paritesi). */
  count: number | null;
  /** BE 91 alt yazısı — O ANKİ girdilerle kurulur; `count` null iken null. */
  caption: string | null;
}

export function deriveBlockEstimate(values: BlockFormValues): BlockEstimate {
  // 🔴 T1 TASLAĞI (T2 düzeltir): yalnız kat sayısı okunuyor, `units_per_floor`
  // ve `shop_count` hiç geçmiyor; "üçü de boşsa null" kuralı YOK; alt yazı
  // mockup'tan KOPYALANMIŞ sabit — yani tam olarak yasaklanan davranış.
  const floorCount = Number(values.floorCount);
  return {
    count: Number.isFinite(floorCount) ? floorCount : null,
    caption: "8 kat × 3 daire + 2 dükkan",
  };
}
