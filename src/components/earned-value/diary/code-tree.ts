/**
 * PLN-F2.3 · İş kodu ağacı (`GET /code-tree`) yardımcıları — SAF.
 *
 * İş kodu = düğüm kimliği (§3.3, B2 sapma 5): `d:` disiplin (L1) · `g:` BOQ
 * grubu (L2) · `i:` BOQ kalemi (L3) · `l:<kalem>:<bölüm|none>` yaprak (L4).
 * Mockup seçicisi (İ:410-419, İ:636-641) disiplini ve kalemi BAŞLIK çizer;
 * seçilen kolonlar üst grup ve yapraktır. Oransız yaprak (`has_rate=false`)
 * pasif "· oran yok" basılır (backend onu 422 ile reddeder, K12).
 */
import type { EvCodeNode } from "@/lib/api/models";

import type { AllocationRule } from "./allocation-model";

export type CodeIndex = ReadonlyMap<string, EvCodeNode>;

const LEVEL_DISCIPLINE = 1;
const LEVEL_GROUP = 2;
const LEVEL_ITEM = 3;
const LEVEL_LEAF = 4;

export function buildCodeIndex(nodes: readonly EvCodeNode[]): CodeIndex {
  return new Map(nodes.map((node) => [node.id, node]));
}

export interface ColumnHeader {
  /** Üst satır (mono): kalem kodu / disiplin kodu. */
  code: string;
  /** Alt satır: "Kalıp · Kat 6–10" / "Betonarme işleri". */
  short: string;
  isLeaf: boolean;
  /** Aktif baseline ağacında yok (backend uyarısı `warnings[]`de). */
  isKnown: boolean;
}

function parentOf(node: EvCodeNode, index: CodeIndex): EvCodeNode | undefined {
  return node.parent_id === null ? undefined : index.get(node.parent_id);
}

export function columnHeader(nodeId: string, index: CodeIndex, fallbackLabel: string | null): ColumnHeader {
  const node = index.get(nodeId);
  if (node === undefined) {
    return { code: "", short: fallbackLabel ?? nodeId, isLeaf: nodeId.startsWith("l:"), isKnown: false };
  }
  const parent = parentOf(node, index);
  if (node.level === LEVEL_LEAF) {
    const itemLabel = parent?.label ?? "";
    return { code: parent?.code ?? "", short: itemLabel ? `${itemLabel} · ${node.label}` : node.label, isLeaf: true, isKnown: true };
  }
  const code = node.level === LEVEL_GROUP ? (parent?.code ?? "") : (node.code ?? "");
  return { code, short: node.label, isLeaf: false, isKnown: true };
}

export type PickerKind = "discipline" | "group" | "item" | "leaf";

export interface PickerEntry {
  id: string;
  kind: PickerKind;
  label: string;
  code: string;
  selectable: boolean;
  selected: boolean;
  noRate: boolean;
}

const KIND_BY_LEVEL: Record<number, PickerKind> = {
  [LEVEL_DISCIPLINE]: "discipline",
  [LEVEL_GROUP]: "group",
  [LEVEL_ITEM]: "item",
  [LEVEL_LEAF]: "leaf",
};

function searchText(node: EvCodeNode, index: CodeIndex): string {
  const parent = parentOf(node, index);
  const extra = node.level === LEVEL_LEAF ? `${parent?.label ?? ""} ${parent?.code ?? ""}` : "";
  return `${node.label} ${node.code ?? ""} ${extra}`.toLocaleLowerCase("tr-TR");
}

function toEntry(node: EvCodeNode, index: CodeIndex, selected: ReadonlySet<string>): PickerEntry {
  const kind = KIND_BY_LEVEL[node.level] ?? "leaf";
  const noRate = kind === "leaf" && node.has_rate === false;
  const label =
    kind === "group" ? `${node.label} (üst grup)` : noRate ? `${node.label} · oran yok` : node.label;
  const code = kind === "item" || kind === "discipline" ? (node.code ?? "") : kind === "group" ? (parentOf(node, index)?.code ?? "") : "";
  return {
    id: node.id,
    kind,
    label,
    code,
    selectable: (kind === "group" || kind === "leaf") && !noRate,
    selected: selected.has(node.id),
    noRate,
  };
}

/**
 * Seçici satırları — ağaç sırası korunur (backend önce-derinlik döner).
 * Aramada bir düğüm, kendisi ya da bir torunu eşleşiyorsa görünür; böylece
 * eşleşen yaprağın disiplin/grup/kalem başlıkları bağlamı taşır.
 */
export function pickerEntries(
  nodes: readonly EvCodeNode[],
  query: string,
  selected: ReadonlySet<string>,
): PickerEntry[] {
  const index = buildCodeIndex(nodes);
  const needle = query.trim().toLocaleLowerCase("tr-TR");
  const visible = new Set<string>();
  for (const node of nodes) {
    if (needle !== "" && !searchText(node, index).includes(needle)) continue;
    for (let current: EvCodeNode | undefined = node; current; current = parentOf(current, index)) {
      visible.add(current.id);
    }
  }
  return nodes.filter((node) => visible.has(node.id)).map((node) => toEntry(node, index, selected));
}

/** Yeni kolonun kipi (İ:599 `gmode` varsayılanı 'qty'): yaprak doğrudan, üst düğüm miktara göre. */
export function defaultRuleFor(node: EvCodeNode | undefined): AllocationRule {
  return node?.level === LEVEL_LEAF ? "direct" : "prorata_by_daily_qty";
}

/** Kopyalanan desende kabul edilen kod: ağaçta var ve oransız yaprak değil. */
export function isAllocatableCode(index: CodeIndex): (nodeId: string) => boolean {
  return (nodeId) => {
    const node = index.get(nodeId);
    return node !== undefined && node.has_rate !== false;
  };
}
