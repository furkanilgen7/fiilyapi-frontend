import { formatQuantity } from "@/lib/format";
import type { EvBudgetView } from "@/lib/api/models";

import { indexGroups, indexLeaves, type LeafEntry } from "./budget-tree";
import type { RevisionMode } from "./revision-state";

/**
 * PLN-F1.6 · Dondurma engel/uyarı özeti (B1-7 · Ek Formlar M6) — SAF.
 *
 * Engel listesinin TEK kaynağı backend'dir (`freeze_blockers`); burada yalnız
 * metne ve ilgili ADIMA çevrilir. İstemcinin kendi ürettiği tek engel
 * "Dondurulacak taslak yok"tur: taslak görüntülenmiyorsa dondurulacak bir
 * şey yoktur (M6 b).
 */

export type BudgetStep = 1 | 2 | 3 | 4;

export interface FreezeBlocker {
  code: string;
  title: string;
  /** Etkilenen grup/yaprak adları (M6: "IZO.01 Su yalıtımı · ELK.02 Zayıf akım"). */
  detail: string | null;
  /** Bağlantı verilecek adım; null = adım bağlantısı yok. */
  step: BudgetStep | null;
}

export interface StepSubtitle {
  text: string;
  danger: boolean;
}

const DETAIL_LIMIT = 3;
const DETAIL_SEPARATOR = " · ";
const WINDOW_CODES = new Set(["missing_window", "no_working_day"]);

function joinDetail(parts: readonly string[]): string | null {
  if (parts.length === 0) return null;
  const head = parts.slice(0, DETAIL_LIMIT).join(DETAIL_SEPARATOR);
  return parts.length > DETAIL_LIMIT ? `${head} …` : head;
}

function leafDetail(entry: LeafEntry): string {
  const { item, leaf } = entry;
  return `${item.code} ${item.description} · ${formatQuantity(leaf.planned_qty)} ${item.uom}`;
}

function leafEntries(view: EvBudgetView, nodeIds: readonly string[]): LeafEntry[] {
  const index = indexLeaves(view);
  return nodeIds.map((id) => index.get(id)).filter((e): e is LeafEntry => e !== undefined);
}

function groupBlocker(view: EvBudgetView, count: number, nodeIds: readonly string[]): FreezeBlocker {
  const groups = indexGroups(view);
  const names = nodeIds.map((id) => groups.get(id)?.name).filter((n): n is string => Boolean(n));
  return {
    code: "disciplineless_group",
    title: `${count} BOQ grubu disiplinsiz (doğrudan bütçeli)`,
    detail: joinDetail(names),
    step: 1,
  };
}

function windowBlocker(view: EvBudgetView, code: string, count: number, nodeIds: readonly string[]): FreezeBlocker {
  const entries = leafEntries(view, nodeIds);
  const allUnsectioned = entries.length > 0 && entries.every((e) => e.leaf.section_id === null);
  const title =
    code === "no_working_day"
      ? `${count} yaprağın penceresinde iş günü yok`
      : `${count} ${allUnsectioned ? "Bölümsüz yaprağın" : "yaprağın"} penceresi çıkmıyor`;
  return { code, title, detail: joinDetail(entries.map(leafDetail)), step: 2 };
}

export function freezeBlockers(view: EvBudgetView, mode: RevisionMode): FreezeBlocker[] {
  if (mode !== "draft") {
    return [{ code: "no_draft", title: "Dondurulacak taslak yok", detail: null, step: null }];
  }
  return view.freeze_blockers.map((finding) => {
    if (finding.code === "disciplineless_group") return groupBlocker(view, finding.count, finding.node_ids);
    if (WINDOW_CODES.has(finding.code)) {
      return windowBlocker(view, finding.code, finding.count, finding.node_ids);
    }
    // Tanınmayan kod SESSİZCE düşmez: sayısıyla listelenir (engel yine engeldir).
    return {
      code: finding.code,
      title: `${finding.count} dondurma engeli (${finding.code})`,
      detail: null,
      step: null,
    };
  });
}

/** UYARI (engel değil): boş oranlı yaprak sayısı (B1-7, BÜT:459-461). */
export function emptyRateCount(view: EvBudgetView): number {
  return view.freeze_warnings.find((w) => w.code === "empty_rate")?.count ?? 0;
}

function blockerCount(view: EvBudgetView, codes: ReadonlySet<string>): number {
  return view.freeze_blockers.filter((f) => codes.has(f.code)).reduce((sum, f) => sum + f.count, 0);
}

/** Adım çubuğu alt metinleri (BÜT:646-648 · Ek Formlar başlık adım çubuğu + M1 c). */
export function stepSubtitles(
  view: EvBudgetView,
  mode: RevisionMode,
  blockers: readonly FreezeBlocker[],
): [StepSubtitle, StepSubtitle, StepSubtitle, StepSubtitle] {
  const isDraft = mode === "draft";
  const disciplineless = isDraft ? blockerCount(view, new Set(["disciplineless_group"])) : 0;
  const empty = emptyRateCount(view);
  const step1Parts = [
    disciplineless > 0 ? `${disciplineless} grup disiplinsiz` : null,
    empty > 0 ? `${empty} oran eksik` : null,
  ].filter((p): p is string => p !== null);

  const windowless = isDraft ? blockerCount(view, WINDOW_CODES) : 0;
  const disciplineCount = view.disciplines.filter((d) => d.discipline_id !== null).length;
  const isFrozen = mode === "active" || mode === "archived";

  return [
    { text: step1Parts.length > 0 ? step1Parts.join(" · ") : "Tamam", danger: step1Parts.length > 0 },
    windowless > 0
      ? { text: `${windowless} yaprak penceresiz`, danger: true }
      : { text: `${disciplineCount} disiplin · dağılım`, danger: false },
    { text: "S-eğrisi · işçi", danger: false },
    isFrozen
      ? { text: "Donduruldu", danger: false }
      : blockers.length > 0
        ? { text: `${blockers.length} engel · dondurulamaz`, danger: true }
        : { text: "Dondurulmadı", danger: false },
  ];
}
