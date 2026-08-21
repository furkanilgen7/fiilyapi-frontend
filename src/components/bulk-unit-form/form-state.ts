/**
 * F-UNIT2 T1 · TU ("Toplu Ünite Üretimi") formunun DURUM modeli.
 *
 * ⚠️ PENDING YÜZEYLER GÖVDEYE SIZAMAZ (F-UNIT1 / F-ST / F-PT emsali). Bu
 * arayüzde BİLEREK YOKTUR:
 *   · TU 104 "Maliyet (₺)" — sunucuda maliyet sütunu AÇILMAZ (karar 3) ve
 *     `UnitBulkSlot`ta da karşılığı yoktur. Ekranda salt-okunur + görünür
 *     gerekçeyle basılır; durumda karşılığı olmadığı için `build-body.ts`ten
 *     geçmesi YAPISAL OLARAK İMKÂNSIZDIR.
 *   · TU 146/171-172 "₺27.264.000" toplam değeri — TÜREV DEĞİL, SUNUCU
 *     alanıdır (`UnitBulkPreview.total_list_value`) ve mockup'ın kendi
 *     satırlarıyla çelişir; istemci onu hesaplamaz, forma girdi olarak da almaz.
 *
 * ⚠️ `projectId` (TU 61) PATH parametresidir; `siteId` (TU 62) YALNIZ
 * SÜZGEÇTİR (blok listesini daraltır) ve `UnitBulkCreate`te KARŞILIĞI
 * YOKTUR — şantiye bloktan türer (`units/models.py`: *"tek otorite `blocks`"*).
 * İkisi de gövdeye GİRMEZ. 🔴 EI (Excel içe aktarma) ile KARIŞTIRILMAMALIDIR:
 * orada `site_id` GERÇEK bir gövde alanıdır.
 *
 * ⚠️ `prefix` mockup'ta YOKTUR ve forma KONMAZ (TU deseni `{Blok}` jetonuyla
 * çalışır); gövdeye şema varsayılanı `""` olarak girer (bkz. `build-body.ts`).
 * Ortak varsayılanlar (`layout` / `gross_area_m2` / `net_area_m2` /
 * `list_price` / `appraisal_value`) de forma KONMAZ: TU kat şablonunu
 * (`slots`) çizer, ortak varsayılanları değil.
 *
 * 🔴 ÜST DÜZEYDE `touched` KÜMESİ YOKTUR — bilerek. Dokunma kapısı NULLABLE
 * bir sütunu ezmemek içindir; oysa bu formun sürdüğü ÜST DÜZEY alanların
 * hepsi üretilmiş tipte ZORUNLUDUR (`block_id` · `unit_kind` · `start_floor` ·
 * `end_floor` · `roof_floor` · `units_per_floor` · `numbering` · `prefix` ·
 * `start_number`) — ezilecek bir `NULL` yoktur ve kapıya alınsalardı ÖLÜ KOD
 * YOLU doğardı (`unit-form/build-body.ts` kural 2'nin kendi gerekçesi).
 * Nullable olan TEK üst düzey alan `floor_price_increase_pct`tir ve onun
 * kapısı TU 137 KUTUCUĞUDUR ("kullanıcı açıkça istedi" — semantiği aynıdır).
 * Gerçek dokunma kapısı SATIR İÇİNDEDİR: `BulkSlotValues.touched`
 * (`slots.ts`), çünkü `layout` ve `facing` orada NULLABLE'dır.
 */

import type { UnitKind, UnitNumberingPattern } from "./constants";
import { parseCountInput } from "@/lib/decimal";
import { resizeSlots, type BulkSlotValues } from "./slots";

export interface BulkUnitFormValues {
  /** TU 61 — PATH parametresi; şantiye/blok listesini sürer. Gövdeye GİRMEZ. */
  projectId: string;
  /** TU 62 — YALNIZ süzgeç; `UnitBulkCreate` alanı DEĞİLDİR. Gövdeye GİRMEZ. */
  siteId: string;
  /** TU 63 — gövdede `block_id`. */
  blockId: string;
  /** MOCKUP + BİR — gövdede `unit_kind`; sunucuda NOT NULL. */
  unitKind: UnitKind;
  /** TU 70 — gövdede `start_floor` (tam sayı, `String(floor)` olarak tutulur). */
  startFloor: string;
  /**
   * TU 71 — gövdede `end_floor` + `roof_floor`. 🔴 BİR kutu → İKİ alan:
   * "Çatı Katı" seçimi `ROOF_FLOOR_SENTINEL` metniyle taşınır ve
   * `floor-range.ts::resolveEndFloor` ikisine ayırır.
   */
  endFloor: string;
  /** TU 72 — gövdede `units_per_floor` (ge=1, le=20). 🔴 0 GEÇERSİZ. */
  unitsPerFloor: string;
  /** TU 79 — gövdede `numbering`; üretilmiş tipte ZORUNLU. */
  numbering: UnitNumberingPattern;
  /** TU 84 — gövdede `start_number` (ge=0, varsayılan 1). */
  startNumber: string;
  /** TU 96-135 — gövdede `slots`; satır sayısı `unitsPerFloor` ile kilitli. */
  slots: readonly BulkSlotValues[];
  /** TU 137 — kutucuk; gövdeye GİRMEZ, yalnız yüzdenin kapısıdır. */
  floorPriceIncreaseEnabled: boolean;
  /** TU 138 — gövdede `floor_price_increase_pct` (ondalık 5,2; ge=0 le=100). */
  floorPriceIncreasePct: string;
}

export type BulkUnitFormField = keyof BulkUnitFormValues;

/**
 * Boş form. Seçicilerin başlangıcı mockup'ta GÖRÜNEN (`selected`) seçenektir.
 * Mockup'taki `"C Blok (8 kat · 3 daire/kat)"` / `148` / `1280000` gibi
 * değerler ÖRNEK VERİDİR, varsayılan değil.
 */
export function emptyBulkUnitFormValues(): BulkUnitFormValues {
  return {
    projectId: "",
    siteId: "",
    blockId: "",
    unitKind: "apartment", // UNIT_KIND_OPTIONS ilk üye — "Daire"
    startFloor: "",
    endFloor: "",
    unitsPerFloor: "",
    numbering: "block_sequence", // TU 79 — `selected` "{Blok}-{Sıra}"
    startNumber: "",
    slots: [],
    floorPriceIncreaseEnabled: true, // TU 137 — mockup'ta `checked`
    floorPriceIncreasePct: "", // TU 138 `1.5` ÖRNEK VERİDİR
  };
}

/** Tek alanı DEĞİŞTİRMEDEN yeni bir değer nesnesi üretir (immutability canonu). */
export function setBulkUnitField<K extends BulkUnitFormField>(
  values: BulkUnitFormValues,
  field: K,
  value: BulkUnitFormValues[K],
): BulkUnitFormValues {
  return { ...values, [field]: value };
}

/**
 * TU 72'nin ÖZEL yazarı: alan ile kat şablonu satırlarını TEK adımda
 * eşitler. İkisini ayrı ayrı yazmak, birini güncelleyip ötekini unutan bir
 * çağıranın sunucuda `len(slots) != units_per_floor` 422'si üretmesine
 * kapı açardı — invaryant tek yerde tutulur.
 */
export function setUnitsPerFloor(values: BulkUnitFormValues, raw: string): BulkUnitFormValues {
  return {
    ...values,
    unitsPerFloor: raw,
    slots: resizeSlots(values.slots, parseCountInput(raw)),
  };
}
