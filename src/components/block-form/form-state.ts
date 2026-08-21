/**
 * F-UNIT1 T1 · BE ("Yeni Blok Ekle") formunun DURUM modeli.
 *
 * ⚠️ PENDING YÜZEYLER GÖVDEYE SIZAMAZ (F-ST/F-PT/F-P8 emsali): BE 109'daki
 * "toplu ünite üretimine geç" kutusu bu arayüzde HİÇ YOKTUR. Ekranda devre
 * dışı basılır ama durumda karşılığı olmadığı için `build-body.ts`ten
 * geçemez — sızıntı yapısal olarak imkânsızdır.
 *
 * ⚠️ `sort_order` mockup'ta YOKTUR: forma bir kutu olarak GİRMEZ. Gövdede yine
 * de bulunur (üretilmiş tip tuzağı, bkz. `build-body.ts`), ama kullanıcı onu
 * göremez/değiştiremez.
 *
 * ⚠️ `projectId` PATH parametresidir (`POST /projects/{project_id}/blocks`) —
 * gövdeye GİRMEZ. Durumda tutulur çünkü şantiye listesini O sürer (BE 62→66).
 */

import type {
  BlockGroundUsage,
  BlockParkingType,
  BlockRoofType,
  BlockStatus,
} from "./constants";

export interface BlockFormValues {
  /** BE 62 — PATH parametresi; şantiye listesini sürer. Gövdeye GİRMEZ. */
  projectId: string;
  /** BE 66 — gövdede `site_id`. */
  siteId: string;
  /** BE 70 — gövdede `name` (max 50). */
  name: string;
  /** BE 71 — gövdede `code` (max 20); boşsa sunucu ÜRETİR. */
  code: string;
  /** BE 78 — tam sayı ≥0. */
  basementFloorCount: string;
  /** BE 79 — tam sayı ≥0. */
  floorCount: string;
  /** BE 80 — boş seçeneği YOK → dokunma kapısı. */
  roofType: BlockRoofType;
  /** BE 81 — tam sayı ≥0. */
  unitsPerFloor: string;
  /** BE 82 — boş seçeneği YOK → dokunma kapısı. */
  groundFloorUsage: BlockGroundUsage;
  /** BE 83 — tam sayı ≥0. */
  shopCount: string;
  /** BE 84 — ondalık(12,2) ≥0. */
  constructionAreaM2: string;
  /** BE 85 — tam sayı ≥0. */
  elevatorCount: string;
  /** BE 86 — boş seçeneği YOK → dokunma kapısı. */
  parkingType: BlockParkingType;
  /** BE 100 — ISO tarih. */
  estimatedDeliveryDate: string;
  /** BE 101 — boş seçeneği YOK → dokunma kapısı. */
  status: BlockStatus;
  /** BE 102 — max 500. */
  notes: string;
}

export type BlockFormField = keyof BlockFormValues;

/**
 * Kullanıcının GERÇEKTEN dokunduğu alanlar. Kapı `build-body.ts`tedir:
 * dokunulmamış bir seçicinin varsayılanı gövdeye GİRMEZ.
 */
export type BlockTouched = ReadonlySet<BlockFormField>;

/**
 * Boş form. Seçicilerin başlangıç değeri mockup'ta GÖRÜNEN seçenektir
 * (BE 80/82/86 ilk seçenek, BE 101 `selected` = "İnşaat Halinde") — ama
 * dokunma kapısı sayesinde bu değerler kendiliğinden gövdeye gitmez.
 *
 * Sayı kutularının mockup'taki `value="2"`/`"8"`/`"3"` gibi değerleri ÖRNEK
 * VERİDİR, varsayılan değil: boş form gerçekten boştur.
 */
export function emptyBlockFormValues(): BlockFormValues {
  return {
    projectId: "",
    siteId: "",
    name: "",
    code: "",
    basementFloorCount: "",
    floorCount: "",
    roofType: "none", // BE 80 — ilk seçenek "Yok"
    unitsPerFloor: "",
    groundFloorUsage: "commercial", // BE 82 — ilk seçenek "Dükkan / Ticari"
    shopCount: "",
    constructionAreaM2: "",
    elevatorCount: "",
    parkingType: "closed", // BE 86 — ilk seçenek "Kapalı Otopark"
    estimatedDeliveryDate: "",
    status: "construction", // BE 101 — `selected` "İnşaat Halinde"
    notes: "",
  };
}

/**
 * Tek alanı DEĞİŞTİRMEDEN yeni bir değer nesnesi üretir (immutability canonu).
 * Gelen `values` ASLA mutasyona uğramaz — React durumu referans eşitliğiyle
 * çalışır, yerinde değiştirmek yeniden çizimi sessizce kaçırır.
 */
export function setBlockField<K extends BlockFormField>(
  values: BlockFormValues,
  field: K,
  value: BlockFormValues[K],
): BlockFormValues {
  // 🔴 T1 TASLAĞI (T2 düzeltir): yerinde yazıyor — yeni nesne DÖNMÜYOR.
  values[field] = value;
  return values;
}
