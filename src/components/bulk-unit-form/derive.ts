/**
 * F-UNIT2 · TU 73 "Toplam Üretilecek" — SAF türev (salt-okunur kutu).
 *
 * 🔴 SUNUCUYLA BİREBİR AYNI FORMÜL. Aynı hesap `units/schemas.py`
 * `UnitBulkCreate._validate_range` içinde ZATEN vardır:
 *
 *     rounds = end_floor - start_floor + 1 + (1 if roof_floor else 0)
 *     if rounds * units_per_floor > 500: reddet
 *
 * Kutu önizleme gelmeden ÖNCE dolduğu için istemcide hesaplanmak zorundadır.
 * İstemci farklı sayarsa kullanıcı "24 ünite" görüp 27 ünite oluşturur ya da
 * ekranda geçerli görünen bir bileşim sunucudan 422 döner.
 *
 * 🔴 ÇATI TURU SINIRA DAHİLDİR. Sunucunun kendi yorumu: *"Cati turu de sinira
 * DAHILDIR: sayilmasaydi kullanici 500 sinirini fazladan bir kat kadar
 * sessizce asardi."* Bu satır adlı bir testle korunuyor.
 *
 * 🔴 YALNIZ ADET HESAPLANIR, PARA HESAPLANMAZ. TU 146/171-172'nin
 * "₺27.264.000" toplamı mockup'ın kendi satırlarıyla çelişir ve `bulk.py`
 * bunu kanon DEĞİL diye kaydetmiştir; toplam liste değeri
 * `UnitBulkPreview.total_list_value` ile SUNUCUDAN gelir. Bu modülde para
 * geçmez — ne girdi ne çıktı olarak.
 */

import {
  BULK_EMPTY_TOTAL,
  BULK_MAX_UNITS,
  BULK_MAX_UNITS_MESSAGE,
  BULK_RANGE_INVALID_MESSAGE,
  BULK_UNITS_PER_FLOOR_MAX,
  BULK_UNITS_PER_FLOOR_MESSAGE,
  BULK_UNITS_PER_FLOOR_MIN,
} from "./constants";

/** Formülün DÖRT girdisi. `null` = kullanıcı henüz seçmedi (`0` ile AYNI DEĞİL). */
export interface BulkRangeInput {
  startFloor: number | null; // TU 70
  endFloor: number | null; // TU 71
  roofFloor: boolean; // TU 71 "Çatı Katı"
  unitsPerFloor: number | null; // TU 72
}

/**
 * Ayrık sonuç: ekran hangi dalı gördüğünü BİLİR. Tek bir `number | null`
 * dönseydi "hesaplanamadı" ile "geçersiz bileşim" aynı kutuya düşer ve
 * kullanıcı sebebini öğrenemezdi.
 */
export type BulkTotalResult =
  | { kind: "incomplete"; text: string }
  | { kind: "invalid_range"; text: string; message: string }
  | { kind: "invalid_units_per_floor"; text: string; message: string }
  | { kind: "over_limit"; text: string; message: string; rounds: number; total: number }
  | { kind: "valid"; text: string; rounds: number; total: number };

/** TU 73 kutusunun metni — "24 ünite". */
function unitText(total: number): string {
  return `${total} ünite`;
}

export function deriveBulkTotal(input: BulkRangeInput): BulkTotalResult {
  const { startFloor, endFloor, roofFloor, unitsPerFloor } = input;

  // 🔴 `0` ile `null` AYRI hâllerdir: Zemin katı (`0`) tamamen geçerli bir
  // seçimdir, `null` ise "henüz seçilmedi" demektir. Doğruluk kontrolü
  // (`!startFloor`) ikisini birleştirir ve Zemin'i sessizce eksik sayardı.
  if (startFloor === null || endFloor === null || unitsPerFloor === null) {
    return { kind: "incomplete", text: BULK_EMPTY_TOTAL };
  }

  // Sunucu sırası: önce Pydantic `Field` kısıtları (ge=1, le=20), sonra
  // `model_validator`ın aralık ve sınır kontrolleri.
  if (unitsPerFloor < BULK_UNITS_PER_FLOOR_MIN || unitsPerFloor > BULK_UNITS_PER_FLOOR_MAX) {
    return {
      kind: "invalid_units_per_floor",
      text: BULK_EMPTY_TOTAL,
      message: BULK_UNITS_PER_FLOOR_MESSAGE,
    };
  }

  if (endFloor < startFloor) {
    return { kind: "invalid_range", text: BULK_EMPTY_TOTAL, message: BULK_RANGE_INVALID_MESSAGE };
  }

  const rounds = endFloor - startFloor + 1 + (roofFloor ? 1 : 0);
  const total = rounds * unitsPerFloor;

  if (total > BULK_MAX_UNITS) {
    return { kind: "over_limit", text: unitText(total), message: BULK_MAX_UNITS_MESSAGE, rounds, total };
  }

  return { kind: "valid", text: unitText(total), rounds, total };
}
