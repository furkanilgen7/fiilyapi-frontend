/**
 * F-UNIT2 · TU 96-135 "Kat Şablonu" tablosunun SAF durum modeli.
 *
 * 🔴 SATIR SAYISI TU 72 "Kat Başına Daire" İLE KİLİTLİDİR. Sunucu kuralı
 * (`schemas.py::_validate_range`): `slots` gönderilirse
 * `len(slots) == units_per_floor` ZORUNLU, `sequence`ler benzersiz ve
 * `max(sequence) <= units_per_floor`. Tablo bağımsız hareket ederse kullanıcı
 * 3 daire yazıp 4 satır doldurur ve kayıt 422 döner — sebebini de göremez.
 * Bu yüzden satır kümesi `resizeSlots()` ile TÜRETİLİR, elle yönetilmez.
 *
 * 🔴 BÜYÜTME/KÜÇÜLTME VERİ KAYBETMEZ. 3 → 2 → 3 gidip gelen kullanıcı üçüncü
 * satırı yeniden doldurmak zorunda kalır (bu kabul edilir) ama 2 → 4 giderken
 * ilk iki satır AYNEN kalır: korunmasaydı daire sayısını düzelten kullanıcı
 * tüm tabloyu kaybederdi.
 *
 * 🔴 TU 104 "Maliyet (₺)" sütununun BURADA KARŞILIĞI YOKTUR (karar 3).
 * `UnitBulkSlot` şemasında da yoktur. Ekranda salt-okunur + görünür gerekçeyle
 * basılır; durumda karşılığı olmadığı için gövdeye sızması yapısal olarak
 * imkânsızdır.
 *
 * 🔴 DOKUNMA KAPISI SATIR İÇİNDEDİR. TU 109/112'nin `<select>`lerinin BOŞ
 * SEÇENEĞİ YOKTUR (`UNIT_LAYOUT_OPTIONS` / `FACING_OPTIONS`), oysa
 * `UnitBulkSlot.layout` ve `.facing` NULLABLE'dır. Kullanıcı dokunmadıysa
 * anahtar gövdeye HİÇ konmaz; ölçüt "değer boş mu" DEĞİL, `touched`
 * kümesidir — seçicinin değeri hiçbir zaman boş olmadığı için boşluğa bakan
 * bir kapı FİİLEN HİÇ KAPANMAZDI (`unit-form/build-body.ts` kural 3).
 */

import { FACING_OPTIONS, type UnitFacing } from "./constants";

export type BulkSlotField = "layout" | "grossAreaM2" | "netAreaM2" | "facing" | "listPrice";

export interface BulkSlotValues {
  /** TU 98 "Sıra" — 1..N, `resizeSlots` tarafından ÜRETİLİR (elle girilmez). */
  sequence: number;
  /** TU 99 — `layout`, nullable → dokunma kapısı. */
  layout: string;
  /** TU 100 — `gross_area_m2`, ondalık(10,2). */
  grossAreaM2: string;
  /** TU 101 — `net_area_m2`, ondalık(10,2). */
  netAreaM2: string;
  /** TU 102 — `facing`, nullable → dokunma kapısı. */
  facing: UnitFacing;
  /** TU 103 — `list_price`, ondalık(18,2). */
  listPrice: string;
  /** Kullanıcının GERÇEKTEN dokunduğu hücreler; kapı `build-body.ts`tedir. */
  touched: ReadonlySet<BulkSlotField>;
}

/**
 * Boş satır. Cephe seçicisinin boş seçeneği olmadığı için başlangıç değeri
 * mockup'ta GÖRÜNEN seçenektir (TU 112 `selected` "Güney"); dokunma kapısı
 * sayesinde bu değer kendiliğinden gövdeye gitmez. TU 109-131'deki `148` /
 * `1280000` / `3+1` gibi değerler ÖRNEK VERİDİR, varsayılan değil.
 */
export function emptySlot(sequence: number): BulkSlotValues {
  return {
    sequence,
    layout: "",
    grossAreaM2: "",
    netAreaM2: "",
    facing: FACING_OPTIONS[0].value, // TU 112 — `selected` "Güney"
    listPrice: "",
    touched: new Set<BulkSlotField>(),
  };
}

/**
 * Satır kümesini `units_per_floor`a eşitler (değişmez).
 *
 * Geçersiz/eksik daire sayısında satır ÜRETİLMEZ: 0 satırlık tablo sunucunun
 * "ortak varsayılanlar" yoluna düşer ve `slots` gövdeye hiç girmez.
 */
export function resizeSlots(
  slots: readonly BulkSlotValues[],
  unitsPerFloor: number | null,
): readonly BulkSlotValues[] {
  if (unitsPerFloor === null || !Number.isSafeInteger(unitsPerFloor) || unitsPerFloor <= 0) {
    return [];
  }

  const next: BulkSlotValues[] = [];
  for (let index = 0; index < unitsPerFloor; index += 1) {
    const sequence = index + 1;
    const kept = slots[index];
    if (kept === undefined) {
      next.push(emptySlot(sequence));
      continue;
    }
    // Sıra zaten doğruysa AYNI nesne korunur — kopyalamak "değişti" sinyali
    // üretir ve React'te gereksiz yeniden çizim doğurur.
    next.push(kept.sequence === sequence ? kept : { ...kept, sequence });
  }
  return next;
}

/** Tek hücreyi değiştirir ve alanı DOKUNULDU diye işaretler (değişmez). */
export function setSlotField<K extends BulkSlotField>(
  slots: readonly BulkSlotValues[],
  index: number,
  field: K,
  value: BulkSlotValues[K],
): readonly BulkSlotValues[] {
  const current = slots[index];
  if (current === undefined) return slots;

  const touched = new Set(current.touched);
  touched.add(field);
  const updated: BulkSlotValues = { ...current, [field]: value, touched };

  return slots.map((slot, position) => (position === index ? updated : slot));
}

/**
 * Satırda kullanıcının koyduğu BİR ŞEY var mı?
 *
 * Seçiciler için ölçüt `touched`tır (değerleri hiçbir zaman boş olmaz),
 * metin/sayı hücreleri için kırpılmış boşluk kontrolüdür.
 */
export function isSlotFilled(slot: BulkSlotValues): boolean {
  if (slot.touched.has("layout") || slot.touched.has("facing")) return true;
  return (
    slot.grossAreaM2.trim() !== "" || slot.netAreaM2.trim() !== "" || slot.listPrice.trim() !== ""
  );
}

/**
 * `slots` gövdeye YALNIZ burası `true` derse girer. Boş tabloyu göndermek
 * sunucunun "ortak varsayılanlar" yolunu (P3 davranışı) kapatırdı; üstelik
 * `len(slots) == units_per_floor` kuralı yüzünden hiçbir şey yazmayan bir
 * tablo bile kaydı 422'ye çevirebilirdi.
 */
export function hasFilledSlot(slots: readonly BulkSlotValues[]): boolean {
  return slots.some(isSlotFilled);
}
