import { normalizeDecimalInput } from "@/lib/decimal";
import { maskeli } from "@/lib/masked";
import type { BoqGroup, BoqItem } from "@/lib/api/hooks/useBoq";

/**
 * Kartın satır kümesi — İKİ YANITTAN kurulur ve hangisinin neyi taşıdığı
 * BOQ-SEC K2/K5 gereği KARIŞTIRILAMAZ:
 *
 *  · süzgeçSİZ yanıt (`GET /sites/{id}/boq`)     → pozun GERÇEK metadata'sı
 *    (`quantity` = şantiye kotası, `allocated_quantity`, `unit_price`)
 *  · süzgeçLİ yanıt (`…?section_id=`)            → `quantity` BU BÖLÜMÜN payına
 *    MASKELENİR
 *
 * Metadata daima süzgeçsizden, bölüm payı daima süzgeçliden okunur. Tersi
 * yapılsaydı ekran sessizce yanlış sayı basardı ve hiçbir tip hatası olmazdı.
 *
 * 🔴 BU DOSYA GÖSTERİM YOLUDUR: `BoqAssignmentCard`ın render gövdesinden
 * çağrılır. Burada `maskesiz()` KULLANILMAZ — gerekçesi `lib/masked.ts`
 * docstring'indeki hikâyededir (maskeli metraj burada ATIYORDU ve muhasebe
 * rolüne BEYAZ EKRAN veriyordu).
 */
export interface AssignmentRow {
  readonly item: BoqItem;
  readonly groupName: string;
  /**
   * Bu bölümün SUNUCUDAKİ payı.
   *
   * ÜÇ ayrı hâl vardır ve üçü de AYRI okunur — ikisini birleştirmek kusurdur:
   *   `"0"`  → bu bölümde payı YOK,
   *   `null` → pay VAR ama METRAJ GİZLİ (`boq` kapsamı `finance`),
   *   sayı   → payın kendisi.
   * 🔴 Maskeli payı `"0"`a düşürmek "payı yok" YALANINI söylerdi ve satır
   * karttan sessizce kaybolurdu.
   */
  readonly sectionQuantity: string | null;
  /** Taslak varsa taslak, yoksa sunucudaki pay — tutar bundan türer. */
  readonly effectiveQuantity: string | null;
}

/**
 * Süzgeçli yanıttan `itemId → bu bölümün payı` haritası.
 *
 * 🔴 Maskeli pay haritaya `null` olarak GİRER, atlanmaz: anahtarın VARLIĞI
 * "bu kalem bu bölüme tahsisli" bilgisini taşır ve o bilgi maskeli DEĞİLDİR
 * (kimlik kovası). Backend süzgeçli yanıtta yalnız tahsisli kalemleri döndürür
 * (`boq/service.py`: *"yalniz o bolume tahsisi olan kalemler doner"*), yani
 * anahtar varsa pay da vardır — okunamasa bile.
 */
export function sectionQuantityMap(
  groups: readonly BoqGroup[],
): ReadonlyMap<string, string | null> {
  const map = new Map<string, string | null>();
  for (const group of groups) {
    for (const item of group.items) map.set(item.id, item.quantity);
  }
  return map;
}

/**
 * Satırın METRAJI gizli mi? Gizliyse tahsis ne GÖSTERİLEBİLİR ne YAZILABİLİR.
 *
 * 🔴 PARA maskesi (`limited` kapsamı: şantiye şefi, satınalma) BURADA
 * SAYILMAZ ve bu bilinçlidir: o rol metrajı GÖRÜR, yalnız birim fiyatı
 * göremez. Para maskesini de "yazamaz" saysaydık şantiye şefinin bölüme poz
 * atama ekranını sebepsiz kapatırdık — ekranı çökertmek yerine KULLANILAMAZ
 * kılmak, kusuru onarmak değil yerini değiştirmek olurdu.
 */
export function isQuantityMasked(row: {
  readonly item: Pick<BoqItem, "allocated_quantity" | "unallocated_quantity">;
  readonly sectionQuantity: string | null;
}): boolean {
  return (
    maskeli(row.sectionQuantity) ||
    maskeli(row.item.allocated_quantity) ||
    maskeli(row.item.unallocated_quantity)
  );
}

/**
 * Basılacak satırlar: bu bölüme payı OLAN pozlar + kullanıcının taslakta
 * eklediği pozlar. Şantiyenin geri kalan pozları karta DÖKÜLMEZ — kart
 * "bu bölüme atananlar"dır, poz kataloğu değil (o iş seçicidedir).
 */
export function buildAssignmentRows(
  siteGroups: readonly BoqGroup[],
  sectionQuantities: ReadonlyMap<string, string | null>,
  draft: ReadonlyMap<string, string>,
): readonly AssignmentRow[] {
  const rows: AssignmentRow[] = [];
  for (const group of siteGroups) {
    for (const item of group.items) {
      // 🔴 `get(...) ?? "0"` YAZILAMAZ: maskeli pay (`null`) ile "bu bölümde
      //    payı yok" (anahtar YOK) hâlini aynı değere düşürürdü. Ayrım
      //    `has()` ile yapılır.
      const hasShare = sectionQuantities.has(item.id);
      const sectionQuantity = hasShare ? (sectionQuantities.get(item.id) ?? null) : "0";
      const draftRaw = draft.get(item.id);
      // Maskeli pay da PAYDIR — satır basılır, sayısı "—" görünür.
      const hasServerShare = hasShare && (sectionQuantity === null || Number(sectionQuantity) > 0);
      const hasDraft = draftRaw !== undefined;
      if (!hasServerShare && !hasDraft) continue;
      // Taslakta "" (× ile çıkarılmış) satır GÖRÜNÜR kalır: kullanıcı
      // kaydetmeden önce ne sildiğini görmeli, satır ekrandan KAÇMAMALI.
      const effective =
        draftRaw === undefined ? sectionQuantity : (normalizeDecimalInput(draftRaw) ?? "0");
      rows.push({
        item,
        groupName: group.name,
        sectionQuantity,
        effectiveQuantity: effective,
      });
    }
  }
  return rows;
}
