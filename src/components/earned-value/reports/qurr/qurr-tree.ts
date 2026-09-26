/**
 * PLN-F3.5 · QURR tablosunun SAF ağaç kurucusu.
 *
 * PLANLAMA-SPEC.md §3.15 S1: "İSTEMCİDE TÜRETME YOK — ağaç `parent_id`den". Backend
 * `rows[]` (L3 iş tipleri) ve `totals[]` (disiplin/alt grup/Σ D/Σ D+DL ara
 * toplamları) DÜZ dizilerdir; her ikisi de kendi `parent_id`sini taşır.
 * Bu fonksiyon iki diziyi TEK bir `parent_id` ilişkisiyle `TreeTable`ın
 * beklediği iç içe `TreeNode<T>` biçimine çevirir — disiplin/Σ toplamlarının
 * SIRASI (Q mockup'ının GEN'den önce "Σ D" basması, en sonda "Σ D+DL") ya da
 * hiyerarşisi burada YENİDEN KURULMAZ, `totals[]`in kendi array sırası ve
 * `parent_id`si zaten doğrudur — bu fonksiyon yalnız DÜZLEŞTİRİLMİŞ diziyi
 * ağaca KATLAR, iş kuralı taşımaz.
 */
import type { TreeNode } from "../../common/tree-table/tree-rows";
import type { EvQurrRow, EvQurrTotal } from "@/lib/api/models";

export type QurrTreeNodeData = { kind: "row"; row: EvQurrRow } | { kind: "total"; total: EvQurrTotal };

interface FlatEntry {
  readonly id: string;
  readonly parentId: string | null;
  readonly data: QurrTreeNodeData;
}

/**
 * `QurrTotal.node_id` disiplin/alt grup için doludur; Σ D / Σ D+DL'de
 * (`direct_total`/`all_total`) `null`dur — o iki tekil satır için `kind`den
 * türetilen SABİT bir kimlik yeterlidir (raporda ikisi de en fazla BİR kez
 * geçer).
 */
function totalNodeId(total: EvQurrTotal, index: number): string {
  return total.node_id ?? `qurr-total-${total.kind}-${index}`;
}

export function buildQurrTree(
  rows: readonly EvQurrRow[],
  totals: readonly EvQurrTotal[],
): TreeNode<QurrTreeNodeData>[] {
  const entries: FlatEntry[] = [
    ...totals.map(
      (total, index): FlatEntry => ({
        id: totalNodeId(total, index),
        parentId: total.parent_id ?? null,
        data: { kind: "total", total },
      }),
    ),
    ...rows.map(
      (row): FlatEntry => ({
        id: row.node_id,
        parentId: row.parent_id ?? null,
        data: { kind: "row", row },
      }),
    ),
  ];

  const childrenByParent = new Map<string | null, FlatEntry[]>();
  for (const entry of entries) {
    const bucket = childrenByParent.get(entry.parentId);
    if (bucket) bucket.push(entry);
    else childrenByParent.set(entry.parentId, [entry]);
  }

  const build = (parentId: string | null): TreeNode<QurrTreeNodeData>[] =>
    (childrenByParent.get(parentId) ?? []).map((entry) => {
      const children = build(entry.id);
      return children.length > 0
        ? { id: entry.id, data: entry.data, children }
        : { id: entry.id, data: entry.data };
    });

  return build(null);
}
