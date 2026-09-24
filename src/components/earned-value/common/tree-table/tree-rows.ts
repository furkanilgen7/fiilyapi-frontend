/**
 * PLN-F1.2 · Çok seviyeli ağaç tablonun SAF veri/mantık katmanı.
 *
 * Girdi İÇ İÇE ağaçtır (`children`), düz `{id, parentId}` listesi DEĞİL:
 *   • Sıra ağacın kendisinde yazılıdır — düz listede kardeş sırası ayrıca
 *     taşınıp çocuk dizini kurulmak zorunda kalırdı.
 *   • Yetim / döngü doğrulaması gerekmez (düz listede `parentId` bilinmeyen bir
 *     kimliği ya da kendi torununu gösterebilir).
 *   • Dört Planlama ekranının verisi doğal olarak iç içedir: disiplin › alt
 *     grup › iş tipi › bölüm (Adam-Saat Bütçesi.dc.html:601-640).
 *
 * Seçim YAPRAK kimlik kümesi olarak tutulur; üst düğümlerin 3 durumlu hâli
 * (checked / indeterminate / unchecked) her çizimde TÜRETİLİR — saklanan
 * türetilmiş durum eskiyemez. Emsal: `project-timeline/rows.ts:34-51`
 * (katlama kümesinden görünür satır listesi).
 *
 * Bütün fonksiyonlar girdiyi DEĞİŞTİRMEZ; yeni `Set` / dizi döndürür.
 */

export interface TreeNode<T> {
  /** Ağaç genelinde TEKİL kimlik (açık/seçim kümeleri bu kimlikle tutulur). */
  readonly id: string;
  readonly data: T;
  /** Boş dizi ya da yokluk = yaprak. */
  readonly children?: readonly TreeNode<T>[];
}

export interface VisibleRow<T> {
  readonly id: string;
  readonly node: TreeNode<T>;
  readonly parentId: string | null;
  /** Kök = 0. */
  readonly depth: number;
  readonly hasChildren: boolean;
  /** Yalnız çocuklu düğümde anlamlıdır; yaprakta her zaman `false`. */
  readonly expanded: boolean;
}

export type SelectionState = "checked" | "indeterminate" | "unchecked";

/**
 * Başlangıçta açık düğümler:
 *   `"none"` hepsi kapalı · `"all"` hepsi açık ·
 *   sayı N → derinliği N'den küçük düğümler açık (2 = disiplin + alt grup) ·
 *   kimlik listesi → yalnız onlar.
 */
export type DefaultExpanded = "none" | "all" | number | readonly string[];

export function hasChildren<T>(node: TreeNode<T>): boolean {
  return (node.children?.length ?? 0) > 0;
}

export function visibleRows<T>(
  nodes: readonly TreeNode<T>[],
  expanded: ReadonlySet<string>,
): VisibleRow<T>[] {
  const rows: VisibleRow<T>[] = [];
  const walk = (list: readonly TreeNode<T>[], depth: number, parentId: string | null) => {
    for (const node of list) {
      const branch = hasChildren(node);
      const isOpen = branch && expanded.has(node.id);
      rows.push({ id: node.id, node, parentId, depth, hasChildren: branch, expanded: isOpen });
      if (isOpen) walk(node.children ?? [], depth + 1, node.id);
    }
  };
  walk(nodes, 0, null);
  return rows;
}

export function initialExpanded<T>(
  nodes: readonly TreeNode<T>[],
  spec: DefaultExpanded,
): Set<string> {
  if (spec === "none") return new Set();
  if (typeof spec !== "string" && typeof spec !== "number") return new Set(spec);
  const maxDepth = spec === "all" ? Number.POSITIVE_INFINITY : spec;
  const out = new Set<string>();
  const walk = (list: readonly TreeNode<T>[], depth: number) => {
    if (depth >= maxDepth) return;
    for (const node of list) {
      if (!hasChildren(node)) continue;
      out.add(node.id);
      walk(node.children ?? [], depth + 1);
    }
  };
  walk(nodes, 0);
  return out;
}

export function toggleExpanded(expanded: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(expanded);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Düğümün altındaki yaprak kimlikleri (yaprak ise kendisi), ağaç sırasıyla. */
export function collectLeafIds<T>(node: TreeNode<T>): string[] {
  if (!hasChildren(node)) return [node.id];
  return (node.children ?? []).flatMap((child) => collectLeafIds(child));
}

/** Adam-Saat Bütçesi.dc.html:601 `cbFor`: hepsi → ✓ · bir kısmı → – · hiç → boş. */
export function selectionState<T>(
  node: TreeNode<T>,
  selected: ReadonlySet<string>,
): SelectionState {
  const leaves = collectLeafIds(node);
  const count = leaves.filter((id) => selected.has(id)).length;
  if (count === 0) return "unchecked";
  if (count === leaves.length) return "checked";
  return "indeterminate";
}

/**
 * Adam-Saat Bütçesi.dc.html:602 `onCheck`: tamamen seçili → alt yapraklar
 * kaldırılır; aksi hâlde (boş YA DA kısmi) → hepsi seçilir. Alt ağaç dışındaki
 * seçim korunur.
 */
export function toggleSelection<T>(
  selected: ReadonlySet<string>,
  node: TreeNode<T>,
): Set<string> {
  const leaves = collectLeafIds(node);
  const next = new Set(selected);
  if (selectionState(node, selected) === "checked") leaves.forEach((id) => next.delete(id));
  else leaves.forEach((id) => next.add(id));
  return next;
}
