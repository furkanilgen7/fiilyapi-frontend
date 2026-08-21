/**
 * F-UNIT1 T1 · UE 89 "m² Birim Fiyat" — SAF türev (salt-okunur kutu).
 *
 * 🔴 SUNUCUYLA BİREBİR AYNI KURAL. Aynı hesap sunucuda `UnitResponse`
 * üzerinde `unit_price_per_m2` computed field olarak ZATEN vardır
 * (`backend/app/modules/units/schemas.py`):
 *
 *     if self.list_price is None or not self.gross_area_m2:
 *         return None
 *     return _quantize_money(self.list_price / self.gross_area_m2)
 *
 * yani **iki ondalık, ROUND_HALF_UP** ve brüt m² sıfır/boşken **None**.
 * Formdaki canlı önizleme farklı yuvarlarsa kullanıcı kaydetmeden önce bir
 * sayı, kaydettikten sonra (aynı alanı okuyan F-P8 satış formunda) BAŞKA bir
 * sayı görür.
 *
 * 🔴 MOCKUP SAPMASI, ÖLÇÜLDÜ: UE 89 kutusunda `value="8315"` yazar
 * (1.480.000 ÷ 178 = 8.314,606… tam sayıya yuvarlanmış). Sunucu aynı veriyi
 * `8314.61` olarak döner. Sunucu paritesi kazanır — mockup'ın kutu değeri
 * ÖRNEK VERİDİR, biçim kararı değil.
 *
 * 🔴 TABAN HER ZAMAN BRÜT m²'DİR (UE 89 ipucu "Brüt m² üzerinden"); net m²
 * bu hesaba GİRMEZ.
 */

import { formatAmount } from "@/lib/format";
import { normalizeDecimalInput } from "@/lib/decimal";

import { EMPTY_METRIC } from "./constants";
import type { UnitFormValues } from "./form-state";

export interface UnitPricePerM2 {
  /** İki ondalıklı ondalık STRING ("8314.61") veya null. */
  value: string | null;
  /** Kutuda basılacak biçimli metin ("8.314,61"); değer yoksa "—". */
  text: string;
}

export function deriveUnitPricePerM2(values: UnitFormValues): UnitPricePerM2 {
  // 🔴 T1 TASLAĞI (T2 düzeltir): BÖLME YOK — liste fiyatı olduğu gibi
  // dönüyor. Brüt m² hiç okunmuyor, sıfıra bölme dalı yok, yuvarlama yok.
  //
  // T2 notu: `Number(a) / Number(b)` yerine `@/lib/decimal` kanonuna bir
  // bölme yardımcısı eklemek yeğdir — float kalıntısı ("8314.610000000001")
  // hem kutuya hem sunucu paritesine sızar.
  const listPrice = normalizeDecimalInput(values.listPrice);
  return {
    value: listPrice,
    text: listPrice === null ? EMPTY_METRIC : formatAmount(listPrice),
  };
}
