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

import { parseCountInput } from "@/lib/decimal";

import type { BlockFormValues } from "./form-state";

export interface BlockEstimate {
  /** Tahmini ünite adedi; üç girdi de boşken **null** (sunucu paritesi). */
  count: number | null;
  /** BE 91 alt yazısı — O ANKİ girdilerle kurulur; `count` null iken null. */
  caption: string | null;
}

export function deriveBlockEstimate(values: BlockFormValues): BlockEstimate {
  // BE 79 · 81 · 83 — formülün ÜÇ girdisi. `parseCountInput` boş ve anlamsız
  // girdiyi aynı şekilde `null` verir: ikisi de "kullanıcı bir sayı vermedi"
  // demektir, `NaN` ekrana kaçmaz.
  const floorCount = parseCountInput(values.floorCount);
  const unitsPerFloor = parseCountInput(values.unitsPerFloor);
  const shopCount = parseCountInput(values.shopCount);

  // Sunucu paritesi: üçü de boşsa None — "0" hesaplanmış bir sıfır iddiasıdır.
  // (BE 78 bodrum bu dala DA girmez: formülün parçası değildir.)
  if (floorCount === null && unitsPerFloor === null && shopCount === null) {
    return { count: null, caption: null };
  }

  const floors = floorCount ?? 0;
  const perFloor = unitsPerFloor ?? 0;
  const shops = shopCount ?? 0;

  return {
    count: floors * perFloor + shops,
    // BE 91 — cümle O ANKİ girdilerle yeniden kurulur, mockup'tan kopyalanmaz.
    caption: `${floors} kat × ${perFloor} daire + ${shops} dükkan`,
  };
}
