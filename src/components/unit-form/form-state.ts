/**
 * F-UNIT1 T1 · UE ("Ünite Ekle") formunun DURUM modeli.
 *
 * ⚠️ PENDING YÜZEYLER GÖVDEYE SIZAMAZ (F-ST/F-PT/F-P8 emsali). Bu arayüzde
 * BİLEREK YOKTUR:
 *   · UE 91 "Maliyet (₺)" — sunucuda maliyet sütunu AÇILMAZ (karar 3)
 *   · UE 97-99 "Beklenen Kâr" — girdisi maliyettir, hesaplanamaz
 *   · UE 104-121 belge kutuları — `documents` tablosunda `unit_id` YOK
 * Ekranda üçü de devre dışı + görünür gerekçeyle basılır; durumda karşılıkları
 * olmadığı için `build-body.ts`ten geçmeleri YAPISAL OLARAK İMKÂNSIZDIR.
 *
 * ⚠️ `projectId` (UE 63) PATH parametresidir; `siteId` (UE 64) YALNIZ SÜZGEÇTİR
 * (blok listesini daraltır) ve `UnitCreate`te KARŞILIĞI YOKTUR — şantiye blok
 * üzerinden türetilir (`units/models.py`: *"`site_id` YOKTUR: santiye blok
 * uzerinden turetilir … tek otorite `blocks`"*). İkisi de gövdeye GİRMEZ.
 *
 * ⚠️ `sort_order` mockup'ta YOKTUR: forma kutu olarak girmez, gövdeye
 * üretilmiş tip tuzağı yüzünden `0` olarak girer (bkz. `build-body.ts`).
 */

import type {
  UnitFacing,
  UnitKind,
  UnitOwnerSide,
  UnitParkingRight,
  UnitSalesStatus,
} from "./constants";

export interface UnitFormValues {
  /** UE 63 — PATH parametresi; şantiye/blok listesini sürer. Gövdeye GİRMEZ. */
  projectId: string;
  /** UE 64 — YALNIZ süzgeç; `UnitCreate` alanı DEĞİLDİR. Gövdeye GİRMEZ. */
  siteId: string;
  /** UE 65 — gövdede `block_id`. */
  blockId: string;
  /**
   * UE 66 — gövdede `floor`. 🔴 KARAR 4: **METİNDİR** (`str`, max 20), sayı
   * değil. "Zemin" · "Çatı Katı" gibi değerler sayıya çevrilemez ve
   * `ck_units_floor` diye bir CHECK bilerek YOKTUR.
   */
  floor: string;
  /** UE 73 — gövdede `unit_no` (max 30). */
  unitNo: string;
  /** UE 74 — sunucuda NOT NULL; dokunma kapısına GİRMEZ. */
  unitKind: UnitKind;
  /** UE 75 — gövdede `layout`; şemada serbest metin, mockup'ta küratörlü. */
  layout: string;
  /** UE 76 — ondalık(10,2). */
  grossAreaM2: string;
  /** UE 77 — ondalık(10,2). */
  netAreaM2: string;
  /** UE 78 — boş seçeneği YOK → dokunma kapısı. */
  facing: UnitFacing;
  /** UE 79 — ondalık(10,2). */
  balconyAreaM2: string;
  /** UE 80 — tam sayı ≥0. */
  bathroomCount: string;
  /** UE 81 — boş seçeneği YOK → dokunma kapısı. */
  parkingRight: UnitParkingRight;
  /** UE 88 — ondalık(18,2). */
  listPrice: string;
  /** UE 90 — ondalık(18,2). */
  appraisalValue: string;
  /**
   * UE 92 — ondalık(18,2). 🔴 KARAR 2: `min_sale_price <= list_price` HİÇBİR
   * katmanda zorlanmaz (ne şema, ne DB CHECK, ne servis). İstemci de
   * ZORLAMAZ; UE 92'nin "Danışman bu fiyatın altına inemez" ipucu satış
   * ekranının işidir, ünite kaydının değil.
   */
  minSalePrice: string;
  /** UE 93 — küme {1, 10, 20}; boş seçenek YOK → dokunma kapısı. */
  vatRate: string;
  /** UE 94 — üretilmiş tipte ZORUNLU; dokunma kapısına GİRMEZ. */
  salesStatus: UnitSalesStatus;
  /** UE 95 — boş seçeneği YOK → dokunma kapısı. */
  ownerSide: UnitOwnerSide;
}

export type UnitFormField = keyof UnitFormValues;

/** Kullanıcının GERÇEKTEN dokunduğu alanlar; kapı `build-body.ts`tedir. */
export type UnitTouched = ReadonlySet<UnitFormField>;

/**
 * Boş form. Seçicilerin başlangıcı mockup'ta GÖRÜNEN (`selected`) seçenektir;
 * dokunma kapısı sayesinde bu değerler kendiliğinden gövdeye gitmez.
 *
 * Mockup'taki `value="B-12"` / `"178"` / `"1480000"` gibi değerler ÖRNEK
 * VERİDİR, varsayılan değil.
 */
export function emptyUnitFormValues(): UnitFormValues {
  return {
    projectId: "",
    siteId: "",
    blockId: "",
    floor: "",
    unitNo: "",
    unitKind: "apartment", // UE 74 — `selected` "Daire"
    layout: "",
    grossAreaM2: "",
    netAreaM2: "",
    facing: "southwest", // UE 78 — `selected` "Güney-Batı"
    balconyAreaM2: "",
    bathroomCount: "",
    parkingRight: "one_closed", // UE 81 — `selected` "1 Araç (Kapalı)"
    listPrice: "",
    appraisalValue: "",
    minSalePrice: "",
    vatRate: "10", // UE 93 — `selected` "%10"
    salesStatus: "listed", // UE 94 — `selected` "Satışta (Boş)"
    ownerSide: "contractor", // UE 95 — `selected` "Yüklenici (Biz)"
  };
}

/**
 * Tek alanı DEĞİŞTİRMEDEN yeni bir değer nesnesi üretir (immutability canonu).
 */
export function setUnitField<K extends UnitFormField>(
  values: UnitFormValues,
  field: K,
  value: UnitFormValues[K],
): UnitFormValues {
  // 🔴 T1 TASLAĞI (T2 düzeltir): yerinde yazıyor — yeni nesne DÖNMÜYOR.
  values[field] = value;
  return values;
}
