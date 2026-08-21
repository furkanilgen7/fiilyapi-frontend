/**
 * F-UNIT1 T1 · `POST /projects/{project_id}/blocks` gövdesinin TEK kurucusu.
 *
 * DÖRT bağlayıcı kural (hepsinin adlı testi `build-body.test.ts`tedir):
 *
 * 1. **KARAR 11 — HİÇBİR ALAN ZORUNLU DEĞİLDİR.** Mockup'taki kırmızı `*`
 *    (BE 62 · 66 · 70 · 79) YALNIZ UI ipucudur. BOŞ form da gövde üretir;
 *    istemci "zorunlu alan" diye kaydı ENGELLEMEZ. Bu yüzden bu klasörde
 *    `validate.ts` YOKTUR — bilerek.
 * 2. **ÜRETİLMİŞ TİP TUZAĞI:** `sort_order` şemada varsayılanlıdır (`0`) ama
 *    `openapi-typescript` çıktısında ZORUNLU görünür. Mockup'ta karşılığı
 *    olmadığı için forma GİRMEZ, gövdeye ise DAİMA `0` olarak girer
 *    (`SupplierModal` / `stock-entry-form` emsali).
 * 3. **DOKUNMA KAPISI (F-İK/MK-1 canonu):** BE 80 · 82 · 86 · 101 seçicilerinin
 *    BOŞ SEÇENEĞİ YOKTUR — kullanıcı hiç açmasa bile ekranda bir değer görünür.
 *    Kullanıcı dokunmadıysa anahtar gövdeye HİÇ konmaz, sütun `NULL` kalır.
 *    Gerekçe oluşturma kipinde de geçerlidir: `roof_type="none"` ("Yok") ile
 *    `NULL` ("belirtilmedi") AYNI ŞEY DEĞİLDİR; ilkini kullanıcı adına
 *    seçmek onun VERMEDİĞİ bir kararı veriye yazmak olurdu.
 * 4. **PENDING SIZINTISI YASAK:** BE 109 "toplu ünite üretimine geç" kutusu
 *    gövdeye HİÇBİR anahtar eklemez; `project_id` de gövdede DEĞİL PATH'tedir.
 *
 * Boş bırakılan isteğe bağlı alan için anahtar HİÇ kurulmaz (`null` göndermek
 * ile göndermemek sunucuda aynı; gövdeyi gürültüsüz tutmak anahtar KÜMESİ
 * testini okunur kılar).
 */

import type { components } from "@/lib/api/schema";
import { normalizeDecimalInput } from "@/lib/decimal";

import type { BlockFormField, BlockFormValues, BlockTouched } from "./form-state";

export type BlockCreate = components["schemas"]["BlockCreate"];

/** Mockup'ta kutusu olmayan `sort_order` için tek kaynak (şema varsayılanı). */
export const BLOCK_DEFAULT_SORT_ORDER = 0;

export function buildBlockBody(values: BlockFormValues, touched: BlockTouched): BlockCreate {
  // 🔴 T1 TASLAĞI (T2 düzeltir): kapı "dokunuldu mu" yerine "boş değil mi"
  // soruyor. Seçicilerin varsayılanı hiçbir zaman boş olmadığı için kapı
  // FİİLEN HİÇ KAPANMIYOR — canon 3 henüz kurulmadı.
  const isTouched = (field: BlockFormField): boolean =>
    touched.has(field) || values[field] !== "";

  return {
    name: values.name,
    sort_order: BLOCK_DEFAULT_SORT_ORDER,
    site_id: values.siteId,
    code: values.code,
    // 🔴 T1 TASLAĞI: boş kutu `Number("")` ile 0'a düşüyor; anahtarın HİÇ
    // kurulmaması gerekirdi (T2).
    basement_floor_count: Number(values.basementFloorCount),
    floor_count: Number(values.floorCount),
    ...(isTouched("roofType") ? { roof_type: values.roofType } : {}),
    units_per_floor: Number(values.unitsPerFloor),
    ...(isTouched("groundFloorUsage")
      ? { ground_floor_usage: values.groundFloorUsage }
      : {}),
    shop_count: Number(values.shopCount),
    // 🔴 T1 TASLAĞI: `normalizeDecimalInput` çağrılmıyor — TR virgülü ham
    // geçiyor (T2).
    construction_area_m2: values.constructionAreaM2,
    elevator_count: Number(values.elevatorCount),
    ...(isTouched("parkingType") ? { parking_type: values.parkingType } : {}),
    estimated_delivery_date: values.estimatedDeliveryDate,
    ...(isTouched("status") ? { status: values.status } : {}),
    notes: values.notes,
  };
}

/**
 * T2 için not: ondalık alan gövdeye STRING olarak girer (şema `number | string`).
 * `Number()`e çevirmek 12,2'lik alanlarda hassasiyet kaybı riskidir — kanon
 * yardımcı `@/lib/decimal`tedir.
 */
export { normalizeDecimalInput };
