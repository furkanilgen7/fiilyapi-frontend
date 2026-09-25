import type { BoqListResponse } from "@/lib/api/hooks/useBoq";
import type { SectionListItem } from "@/lib/api/hooks/useSiteSections";

import type { DiaryTreeBoqItem, DiaryTreeSection } from "./diary-lines-tree";

/**
 * PLN-F2.2 · ağacın girdileri ekranın ZATEN çektiği yanıtlardan türetilir —
 * ek istek yok (N+1'den kaçış): bölümler `useSite().sections` (sıra + kod),
 * kalem sırası ve Bölümsüz planlısı `useBoq` (grup → kalem `sort_order`).
 */
export function siteTreeSections(sections: readonly SectionListItem[]): DiaryTreeSection[] {
  return sections.map((section) => ({
    id: section.id,
    name: section.name,
    code: section.code,
    sort_order: section.sort_order,
  }));
}

export function boqTreeItems(boq: BoqListResponse | undefined): DiaryTreeBoqItem[] {
  if (!boq) return [];
  return [...boq.groups]
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((group) => [...group.items].sort((a, b) => a.sort_order - b.sort_order))
    .map((item) => ({
      id: item.id,
      code: item.code,
      description: item.description,
      unit: item.unit,
      unit_price: item.unit_price,
      unallocated_quantity: item.unallocated_quantity,
    }));
}
