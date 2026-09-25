/**
 * PLN-F3.3 · Panel disiplin tablosunun SAF ağaç kurucusu.
 *
 * F3-SOZLESME.md §0: "İSTEMCİDE TÜRETME YOK — ağaç `parent_id`den". Backend
 * `rows: PanelRow[]` DÜZ bir dizidir (Genel / Genel–Kendi / Genel–Taşeron /
 * disiplin / iş tipi), kendi `parent_id`sini taşır. Emsal: `qurr/qurr-tree.ts`
 * (B, PLN-F3.5) — AYNI desen, tek fark PanelRow'un tek bir veri TÜRÜ olması
 * (QurrRow/QurrTotal ikilisi değil).
 */
import type { TreeNode } from "../../common/tree-table/tree-rows";
import type { EvPanelReport } from "@/lib/api/models";

export type EvPanelRow = EvPanelReport["rows"][number];

/**
 * `PanelRow.node_id` toplama satırlarında (Genel, Genel–Kendi, Genel–Taşeron,
 * Genel/Dolaylı) `null`dur — `scope` alanı raporda TEKİL olduğu için
 * (`overall`/`overall_own`/`overall_subcon`/`non_direct`) `scope`ten türeyen
 * SABİT bir kimlik yeterlidir (QurrTotal'ın `direct_total`/`all_total`
 * deseniyle AYNI gerekçe).
 */
export function panelRowNodeId(row: EvPanelRow, index: number): string {
  return row.node_id ?? `panel-row-${row.scope}-${index}`;
}

export function buildPanelTree(rows: readonly EvPanelRow[]): TreeNode<EvPanelRow>[] {
  const entries = rows.map((row, index) => ({
    id: panelRowNodeId(row, index),
    parentId: row.parent_id ?? null,
    data: row,
  }));

  const childrenByParent = new Map<string | null, typeof entries>();
  for (const entry of entries) {
    const bucket = childrenByParent.get(entry.parentId);
    if (bucket) bucket.push(entry);
    else childrenByParent.set(entry.parentId, [entry]);
  }

  const build = (parentId: string | null): TreeNode<EvPanelRow>[] =>
    (childrenByParent.get(parentId) ?? []).map((entry) => {
      const children = build(entry.id);
      return children.length > 0
        ? { id: entry.id, data: entry.data, children }
        : { id: entry.id, data: entry.data };
    });

  return build(null);
}
