/**
 * F-UNIT2 T2c · Kaydedilen paylaşımın SUNUCU CEVABINDAN tabloya yansıtılması.
 *
 * 🔴 `PATCH …/units/allocation` YANITI GÜNCEL TAM LİSTEDİR (uç açıklaması:
 * *"Yanit guncel tam listedir — ekran tabloyu yeniden cizer"*). Bu yüzden
 * kaydettikten sonra tabloyu tazelemek için İKİNCİ BİR GET ATILMAZ: cevap
 * zaten elimizdeyken yeniden sormak hem gereksiz bir gidiş-dönüş, hem de
 * cevap gelene kadar ekranda bayat satır bırakmak olurdu.
 *
 * 🔴 CEVAP FARKLI BİR ŞEKİLDEDİR. Uç `UnitListResponse` döner (blok blok
 * gruplu `UnitResponse`), tablo ise `LandShareUnitRow` çizer. İki tip aynı
 * alanları TAŞIMAZ: `LandShareUnitRow` bu ekranın ihtiyacı olan `block_name`,
 * `appraisal_value` ve `buyer_name` gibi alanları ZATEN taşır ve satırları
 * cevapla TAMAMEN değiştirmek onları kaybettirirdi. Bu yüzden cevaptan
 * YALNIZ paylaşımın üç alanı alınır (`owner_side`, `shareholder_id`,
 * `shareholder_name`) ve mevcut satırların ÜZERİNE bindirilir.
 *
 * Bindirme, T1'in `pending` katmanıyla AYNI şekildedir ama anlamı TERSİDİR:
 * `pending` "kullanıcının henüz kaydedilmemiş niyeti", bu ise "sunucunun
 * yazdığı gerçek". İkisi karıştırılamaz — kaydettikten sonra `pending`
 * BOŞALTILIR, bu katman kalır.
 *
 * Bütün işlemler DEĞİŞMEZDİR: girdi satırları yerinde değiştirilmez.
 */

import type { UnitListResponse } from "@/lib/api/hooks/useProjectUnits";

import type { LandShareUnitRow, UnitOwnerSide } from "./allocation-state";

export interface SavedAllocation {
  ownerSide: UnitOwnerSide | null;
  shareholderId: string | null;
  shareholderName: string | null;
}

export type SavedAllocationMap = ReadonlyMap<string, SavedAllocation>;

/** Yanıttaki blok gruplarını tek bir `unit_id → paylaşım` eşlemesine indirger. */
export function savedAllocationFromResponse(response: UnitListResponse): SavedAllocationMap {
  const saved = new Map<string, SavedAllocation>();
  for (const group of response.blocks) {
    for (const unit of group.units) {
      saved.set(unit.id, {
        ownerSide: unit.owner_side,
        shareholderId: unit.shareholder_id,
        shareholderName: unit.shareholder_name,
      });
    }
  }
  return saved;
}

/**
 * Sunucunun yazdığı paylaşımı GÖRÜNEN satırlara bindirir.
 *
 * Eşlemede olmayan satır OLDUĞU GİBİ kalır: kullanıcı süzgeç değiştirip
 * cevapta bulunmayan bir sayfaya geçtiğinde o satırlar sorgunun kendi
 * verisinden gelir ve uydurma bir değerle ezilmez.
 */
export function applySavedAllocation(
  rows: readonly LandShareUnitRow[],
  saved: SavedAllocationMap,
): readonly LandShareUnitRow[] {
  if (saved.size === 0) return rows;
  return rows.map((row) => {
    const entry = saved.get(row.unit_id);
    if (entry === undefined) return row;
    return {
      ...row,
      owner_side: entry.ownerSide,
      shareholder_id: entry.shareholderId,
      shareholder_name: entry.shareholderName,
    };
  });
}
