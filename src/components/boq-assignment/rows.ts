import { normalizeDecimalInput } from "@/lib/decimal";
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
 */
export interface AssignmentRow {
  readonly item: BoqItem;
  readonly groupName: string;
  /** Bu bölümün SUNUCUDAKİ payı ("0" = pay yok). */
  readonly sectionQuantity: string;
  /** Taslak varsa taslak, yoksa sunucudaki pay — tutar bundan türer. */
  readonly effectiveQuantity: string;
}

/** Süzgeçli yanıttan `itemId → bu bölümün payı` haritası. */
export function sectionQuantityMap(
  groups: readonly BoqGroup[],
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const group of groups) {
    for (const item of group.items) map.set(item.id, item.quantity);
  }
  return map;
}

/**
 * Basılacak satırlar: bu bölüme payı OLAN pozlar + kullanıcının taslakta
 * eklediği pozlar. Şantiyenin geri kalan pozları karta DÖKÜLMEZ — kart
 * "bu bölüme atananlar"dır, poz kataloğu değil (o iş seçicidedir).
 */
export function buildAssignmentRows(
  siteGroups: readonly BoqGroup[],
  sectionQuantities: ReadonlyMap<string, string>,
  draft: ReadonlyMap<string, string>,
): readonly AssignmentRow[] {
  const rows: AssignmentRow[] = [];
  for (const group of siteGroups) {
    for (const item of group.items) {
      const sectionQuantity = sectionQuantities.get(item.id) ?? "0";
      const draftRaw = draft.get(item.id);
      const hasServerShare = Number(sectionQuantity) > 0;
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
