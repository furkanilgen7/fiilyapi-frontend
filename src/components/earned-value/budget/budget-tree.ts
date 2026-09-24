import type { TreeNode } from "@/components/earned-value/common/tree-table/tree-rows";
import type { EvBudgetView, EvDisciplineRead } from "@/lib/api/models";
import type { EvLeafPatch } from "@/lib/api/hooks/useEvBudgetMutations";

import { compareDecimalStrings } from "@/lib/earned-value/decimal-input";

import { leafLabel, parseRateInput } from "./budget-format";

/**
 * PLN-F1.6 · `BudgetView` → `TreeTable` düğümleri (SAF). Kırılım K2/B1-10:
 * L1 disiplin · L2 BOQ grubu · L3 iş tipi (BOQ kalemi) · L4 yaprak (kalem ×
 * bölüm, "Bölümsüz" dahil). Düğüm kimliği backend'in `d:/g:/i:/l:`
 * kimliğidir — seçim/açık kümeleri doğrudan onunla tutulur.
 *
 * Süzgeç mockup'taki gibi YAPRAK düzeyindedir (Adam-Saat Bütçesi.dc.html:
 * 598 `leafOk`); eşleşen yaprağı kalmayan dal süzgeç açıkken düşer (:608, 614, 619).
 */

export type DisciplineOut = EvBudgetView["disciplines"][number];
export type GroupOut = DisciplineOut["groups"][number];
export type ItemOut = GroupOut["items"][number];
export type LeafOut = ItemOut["leaves"][number];
export type ContractorType = DisciplineOut["default_contractor_type"];

export type BudgetRow =
  | { kind: "discipline"; discipline: DisciplineOut }
  | { kind: "group"; discipline: DisciplineOut; group: GroupOut }
  | { kind: "item"; discipline: DisciplineOut; group: GroupOut; item: ItemOut }
  | { kind: "leaf"; discipline: DisciplineOut; group: GroupOut; item: ItemOut; leaf: LeafOut };

export type BudgetNode = TreeNode<BudgetRow>;

export interface BudgetFilter {
  query: string;
  onlyEmpty: boolean;
}

export interface LeafEntry {
  discipline: DisciplineOut;
  group: GroupOut;
  item: ItemOut;
  leaf: LeafOut;
}

/** Şirket disiplin listesinin grup→disiplin seçicisine giren alt kümesi (K2). */
export interface DisciplineOption {
  id: string;
  code: string;
  name: string;
  color: string;
  defaultContractorType: ContractorType;
}

const LOCALE = "tr-TR";

function normalize(text: string): string {
  return text.toLocaleLowerCase(LOCALE);
}

function leafMatches(item: ItemOut, leaf: LeafOut, filter: BudgetFilter, query: string): boolean {
  if (filter.onlyEmpty && leaf.unit_mhr !== null) return false;
  if (!query) return true;
  return normalize(`${item.description} ${leafLabel(leaf)} ${item.code}`).includes(query);
}

function isFiltering(filter: BudgetFilter): boolean {
  return filter.onlyEmpty || filter.query.trim().length > 0;
}

function itemNode(d: DisciplineOut, g: GroupOut, item: ItemOut, filter: BudgetFilter, query: string) {
  const leaves = item.leaves
    .filter((leaf) => leafMatches(item, leaf, filter, query))
    .map<BudgetNode>((leaf) => ({ id: leaf.id, data: { kind: "leaf", discipline: d, group: g, item, leaf } }));
  if (isFiltering(filter) && leaves.length === 0) return null;
  return { id: item.id, data: { kind: "item", discipline: d, group: g, item }, children: leaves } as BudgetNode;
}

function groupNode(d: DisciplineOut, g: GroupOut, filter: BudgetFilter, query: string): BudgetNode | null {
  const items = g.items
    .map((item) => itemNode(d, g, item, filter, query))
    .filter((n): n is BudgetNode => n !== null);
  if (isFiltering(filter) && items.length === 0) return null;
  return { id: g.id, data: { kind: "group", discipline: d, group: g }, children: items };
}

export function budgetNodes(view: EvBudgetView, filter: BudgetFilter): BudgetNode[] {
  const query = normalize(filter.query.trim());
  return view.disciplines
    .map<BudgetNode | null>((d) => {
      const groups = d.groups
        .map((g) => groupNode(d, g, filter, query))
        .filter((n): n is BudgetNode => n !== null);
      if (isFiltering(filter) && groups.length === 0) return null;
      return { id: d.id, data: { kind: "discipline", discipline: d }, children: groups };
    })
    .filter((n): n is BudgetNode => n !== null);
}

/** Yaprak kimliği → bağlamı (toplu oran, engel detayı, öneri popover'ı). */
export function indexLeaves(view: EvBudgetView): Map<string, LeafEntry> {
  const index = new Map<string, LeafEntry>();
  for (const discipline of view.disciplines) {
    for (const group of discipline.groups) {
      for (const item of group.items) {
        for (const leaf of item.leaves) index.set(leaf.id, { discipline, group, item, leaf });
      }
    }
  }
  return index;
}

/** Grup düğüm kimliği → grup (engel detayındaki grup adları). */
export function indexGroups(view: EvBudgetView): Map<string, GroupOut> {
  return new Map(view.disciplines.flatMap((d) => d.groups.map((g) => [g.id, g] as const)));
}

/** `PATCH …/leaves` satırı: yaprak anahtarı (kalem + bölüm) + GÖNDERİLEN alanlar. */
export function leafPatchFor(
  leaf: Pick<LeafOut, "item_id" | "section_id">,
  fields: Omit<EvLeafPatch, "boq_item_id" | "section_id">,
): EvLeafPatch {
  return { boq_item_id: leaf.item_id, section_id: leaf.section_id, ...fields };
}

/**
 * Bütçe yanıtındaki disiplinler — YALNIZ ağaçta grubu olanlar (backend
 * `build_tree`). Şirket listesinin tamamı `useEvDisciplines` (F1.5) ile gelir;
 * o liste yüklenemezse seçici bu alt kümeyle çalışmaya devam eder.
 */
export function disciplineOptionsFromView(view: EvBudgetView): DisciplineOption[] {
  return view.disciplines
    .filter((d) => d.discipline_id !== null)
    .map((d) => ({
      id: d.discipline_id ?? "",
      code: d.code ?? "",
      name: d.name ?? "",
      color: d.color ?? "",
      defaultContractorType: d.default_contractor_type,
    }));
}

/** Şirket disiplin listesi (`useEvDisciplines`, F1.5) → seçici seçenekleri, `sort_order` sırasıyla. */
export function disciplineOptionsFromCompany(list: readonly EvDisciplineRead[]): DisciplineOption[] {
  return [...list]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((d) => ({ id: d.id, code: d.code, name: d.name, color: d.color, defaultContractorType: d.default_contractor_type }));
}

/** Yanıttaki alt küme + dış (şirket) liste; kimlik başına tek seçenek, dış kayıt kazanır. */
export function mergeDisciplineOptions(
  fromView: readonly DisciplineOption[],
  external: readonly DisciplineOption[] | undefined,
): DisciplineOption[] {
  const byId = new Map(fromView.map((o) => [o.id, o] as const));
  for (const option of external ?? []) byId.set(option.id, option);
  return [...byId.values()];
}

export type RateCommit = { kind: "none" } | { kind: "invalid" } | { kind: "patch"; patch: EvLeafPatch };

/**
 * Oran hücresi odaktan çıkınca (on-blur) gönderilecek gövde. Boş girdi oranı
 * ve kaynağını SİLER (`unit_mhr: null` — LeafPatch sözleşmesi); aynı değer
 * (yalnız biçim farkı: "1,80" ≡ "1.800000") istek üretmez. Elle girilen oranın
 * kaynağı "manual"dır (K4).
 */
export function rateCommit(leaf: LeafOut, raw: string): RateCommit {
  const parsed = parseRateInput(raw);
  if (parsed.kind === "invalid") return { kind: "invalid" };
  if (parsed.kind === "empty") {
    return leaf.unit_mhr === null ? { kind: "none" } : { kind: "patch", patch: leafPatchFor(leaf, { unit_mhr: null }) };
  }
  if (leaf.unit_mhr !== null && compareDecimalStrings(parsed.value, leaf.unit_mhr) === 0) return { kind: "none" };
  return { kind: "patch", patch: leafPatchFor(leaf, { unit_mhr: parsed.value, rate_source: "manual" }) };
}

/** L3 Kendi/Taşeron: disiplin varsayılanı seçilirse MİRASA döner (ItemPatch `null`, F0-2). */
export function itemContractorPatch(
  discipline: Pick<DisciplineOut, "default_contractor_type">,
  value: ContractorType,
): { contractor_type: ContractorType | null } {
  return { contractor_type: value === discipline.default_contractor_type ? null : value };
}

/** Yaprak ezmesi: iş tipi değerine eşit seçim ezmeyi kaldırır (`null`, "geri al" — F0-3). */
export function leafContractorPatch(item: ItemOut, leaf: LeafOut, value: ContractorType): EvLeafPatch {
  return leafPatchFor(leaf, { contractor_type: value === item.contractor_type ? null : value });
}

export function leafDirectPatch(item: ItemOut, leaf: LeafOut, value: boolean): EvLeafPatch {
  return leafPatchFor(leaf, { is_direct: value === item.is_direct ? null : value });
}
