/**
 * F-UNIT1 T1 · `POST /projects/{project_id}/units` gövdesinin TEK kurucusu.
 *
 * BEŞ bağlayıcı kural (hepsinin adlı testi `build-body.test.ts`tedir):
 *
 * 1. **KARAR 11 — HİÇBİR ALAN ZORUNLU DEĞİLDİR.** UE 63 · 64 · 65 · 66 · 73 ·
 *    74 · 75 · 76 · 77 · 88 · 94'teki kırmızı `*` YALNIZ UI ipucudur. Boş form
 *    da gövde üretir; istemci "zorunlu alan" diye kaydı ENGELLEMEZ. Bu yüzden
 *    bu klasörde `validate.ts` YOKTUR — bilerek.
 * 2. **ÜRETİLMİŞ TİP TUZAĞI:** `sort_order` ve `sales_status` şemada
 *    varsayılanlıdır ama `openapi-typescript` çıktısında ZORUNLU görünür;
 *    `unit_kind` ise sunucuda gerçekten NOT NULL'dır. ÜÇÜ DE gövdede DAİMA
 *    bulunur — dokunma kapısına GİRMEZLER (ezilecek `NULL` yoktur; kapıya
 *    alınsalardı ölü kod yolu doğardı — `equipment-form/omit-fields.ts` canonu).
 * 3. **DOKUNMA KAPISI:** UE 66 · 75 · 78 · 81 · 93 · 95 seçicilerinin BOŞ
 *    SEÇENEĞİ YOKTUR. Kullanıcı dokunmadıysa anahtar gövdeye HİÇ konmaz,
 *    sütun `NULL` kalır. `parking_right="none"` ("Yok") ile `NULL`
 *    ("belirtilmedi") AYNI ŞEY DEĞİLDİR.
 * 4. **🔴 MALİYET SIZINTISI YASAK (KARAR 3):** gövdede `cost` / `unit_cost` /
 *    `expected_profit` / `profit` ADINDA HİÇBİR ANAHTAR OLAMAZ — sunucuda
 *    böyle bir sütun YOKTUR. Aynı şekilde `site_id` (UE 64 süzgeci),
 *    `project_id` (PATH) ve belge anahtarları da gövdeye giremez.
 * 5. **KARAR 2:** `min_sale_price > list_price` bileşimi MEŞRUDUR; istemci
 *    bunu engellemez, düzeltmez, uyarı üretip gövdeyi kırpmaz.
 */

import type { components } from "@/lib/api/schema";
import { normalizeDecimalInput } from "@/lib/decimal";

import type { UnitFormField, UnitFormValues, UnitTouched } from "./form-state";

export type UnitCreate = components["schemas"]["UnitCreate"];

/** Mockup'ta kutusu olmayan `sort_order` için tek kaynak (şema varsayılanı). */
export const UNIT_DEFAULT_SORT_ORDER = 0;

export function buildUnitBody(values: UnitFormValues, touched: UnitTouched): UnitCreate {
  // 🔴 T1 TASLAĞI (T2 düzeltir): kapı "dokunuldu mu" yerine "boş değil mi"
  // soruyor. Seçicilerin varsayılanı hiçbir zaman boş olmadığı için kapı
  // FİİLEN HİÇ KAPANMIYOR — canon 3 henüz kurulmadı.
  const isTouched = (field: UnitFormField): boolean =>
    touched.has(field) || values[field] !== "";

  return {
    block_id: values.blockId,
    unit_no: values.unitNo,
    unit_kind: values.unitKind,
    sort_order: UNIT_DEFAULT_SORT_ORDER,
    sales_status: values.salesStatus,
    ...(isTouched("floor") ? { floor: values.floor } : {}),
    ...(isTouched("layout") ? { layout: values.layout } : {}),
    // 🔴 T1 TASLAĞI: `normalizeDecimalInput` çağrılmıyor — TR virgülü ham
    // geçiyor ve boş kutu için anahtar yine de kuruluyor (T2).
    gross_area_m2: values.grossAreaM2,
    net_area_m2: values.netAreaM2,
    ...(isTouched("facing") ? { facing: values.facing } : {}),
    balcony_area_m2: values.balconyAreaM2,
    // 🔴 T1 TASLAĞI: boş kutu `Number("")` ile 0'a düşüyor (T2).
    bathroom_count: Number(values.bathroomCount),
    ...(isTouched("parkingRight") ? { parking_right: values.parkingRight } : {}),
    list_price: values.listPrice,
    appraisal_value: values.appraisalValue,
    min_sale_price: values.minSalePrice,
    ...(isTouched("vatRate") ? { vat_rate: values.vatRate } : {}),
    ...(isTouched("ownerSide") ? { owner_side: values.ownerSide } : {}),
  };
}

/** T2 için not: ondalık alan gövdeye STRING girer; kanon `@/lib/decimal`tedir. */
export { normalizeDecimalInput };
