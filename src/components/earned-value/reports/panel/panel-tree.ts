/**
 * PLN-F3.3 · Panel disiplin tablosunun SAF ağaç kurucusu.
 *
 * PLANLAMA-SPEC.md §3.15 S1: "İSTEMCİDE TÜRETME YOK — ağaç `parent_id`den". Backend
 * `rows: PanelRow[]` DÜZ bir dizidir (Genel / Genel–Kendi / Genel–Taşeron /
 * disiplin / iş tipi), kendi `parent_id`sini taşır. Emsal: `qurr/qurr-tree.ts`
 * (B, PLN-F3.5) — AYNI desen, tek fark PanelRow'un tek bir veri TÜRÜ olması
 * (QurrRow/QurrTotal ikilisi değil).
 */
import type { TreeNode } from "../../common/tree-table/tree-rows";
import type { EvPanelReport } from "@/lib/api/models";

/**
 * S32 (KULLANICI, 2026-09-26): `non_direct` satırının alt etiketi (dolaylı
 * kalem adları) backend `PanelRow.indirect_item_names`ten gelir (EV-BORC-9,
 * openapi PLN-F3.1c). Alan yoksa ya da boşsa alt etiket HİÇ BASILMAZ.
 */
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

/**
 * PLN-F3.6b LİDER DÜZELTMESİ (Panel.dc.html:454 `open: { KAB: true }`) ·
 * TreeTable'ın başlangıç açıklık kümesi — disiplin satırları (`scope ===
 * "discipline"`) her zaman ÜST DÜZEYDİR (bu dosyadaki `buildPanelTree`
 * `parent_id: null` verir), yalnız BİRİNİN iş tipi çocukları başlangıçta
 * AÇIKTIR:
 *   - Disiplin süzgeci SEÇİLİYSE (`?disiplin=`) → o disiplin açık gelir
 *     (mockup'ta filtre "tek disiplin gösteriyor").
 *   - Süzgeç YOKSA → satır SIRASINDAKİ İLK disiplin açılır (mockup'ta KAB).
 * Seçilen/ilk kimlik satırlarda YOKSA (ör. filtre satırları boşalttıysa) boş
 * küme döner — TreeTable tamamen kapalı başlar, çökmez.
 */
export function panelDefaultExpanded(
  rows: readonly EvPanelRow[],
  disciplineId: string | null,
): readonly string[] {
  if (disciplineId !== null) {
    return rows.some((row) => row.scope === "discipline" && row.node_id === disciplineId)
      ? [disciplineId]
      : [];
  }
  const first = rows.find((row) => row.scope === "discipline" && row.node_id !== null);
  return first?.node_id ? [first.node_id] : [];
}
