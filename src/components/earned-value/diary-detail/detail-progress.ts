/**
 * DET-1.3 · Günlük kayıt DETAYININ planlama türevleri — SAF (React yok).
 *
 * Kaynak: `days/{day}` (DayView) — motorun yaprak kazanılmış/harcanan/PF'si,
 * saat hücreleri ve kod listesi. İstemci motoru YENİDEN HESAPLAMAZ; yalnız
 * Kural A "bu bölüm" ara toplamı için bölümün YAPRAKLARINI toplar (backend
 * bölüm düzeyi toplam taşımıyor) ve PF'yi o toplamlardan böler.
 *
 * Yaprak kimliği B2 biçimidir: `l:<kalem>:<bölüm|none>` (`leafNodeIdForLine`).
 */
import type { EvCodeNode, EvDayProgress, EvDayView } from "@/lib/api/models";
import { divideDecimalStrings, isZeroDecimalString, sumDecimalStrings } from "@/lib/decimal";

import type { AllocationRule } from "../diary/allocation-model";
import { columnHeader, type CodeIndex } from "../diary/code-tree";
import { toCenti, type Centi } from "../diary/hours";

const LEAF_PREFIX = "l:";
const NONE_SECTION = "none";
/** PF ham değeri 4 ondalık — gösterim `formatPf`/`pfBand` ile 2 ondalık (K18). */
const PF_SCALE = 4;

/** Yaprağın bölümü; Bölümsüz yaprakta `null`; yaprak olmayan düğümde `undefined`. */
export function leafSectionId(nodeId: string): string | null | undefined {
  if (!nodeId.startsWith(LEAF_PREFIX)) return undefined;
  const section = nodeId.split(":")[2];
  if (section === undefined) return undefined;
  return section === NONE_SECTION ? null : section;
}

export interface SectionProgress {
  earned: string;
  spent: string;
  /** Kazanılmış ÷ harcanan; harcanan sıfırsa `null`. */
  pf: string | null;
}

export function sectionProgress(progress: EvDayProgress | null, sectionId: string): SectionProgress {
  const leaves = (progress?.leaves ?? []).filter((leaf) => leafSectionId(leaf.node_id) === sectionId);
  const earned = sumDecimalStrings(leaves.map((leaf) => leaf.earned_day));
  const spent = sumDecimalStrings(leaves.map((leaf) => leaf.spent_day));
  return { earned, spent, pf: isZeroDecimalString(spent) ? null : divideDecimalStrings(earned, spent, PF_SCALE) };
}

export interface HourSummaryRow {
  nodeId: string;
  /** Mono kod (kalem/disiplin kodu). */
  code: string;
  /** "Kalıp · Kat 6–10" / "Betonarme işleri". */
  short: string;
  isLeaf: boolean;
  rule: AllocationRule;
  /** Koda DOĞRUDAN yazılan saat (hücre toplamı), centi. */
  direct: Centi;
  /** Yaprakta motorun harcananı − doğrudan saat (üst gruptan gelen pay), centi; yoksa 0. */
  groupShare: Centi;
  /** Motorun harcananı (yaprak); üst grupta `null` ("→ alt"). */
  spent: string | null;
  earned: string | null;
  pf: string | null;
  /** Koda saat yazan taşeron firmaları (İ satır etiketi). */
  firms: string[];
}

export interface HourSummary {
  /** Kural A — bu bölümün kodları (bölüm bağlamı yoksa boş). */
  current: HourSummaryRow[];
  others: HourSummaryRow[];
}

function descendsIntoSection(nodeId: string, sectionId: string, nodes: readonly EvCodeNode[], index: CodeIndex): boolean {
  return nodes.some((node) => {
    if (leafSectionId(node.id) !== sectionId) return false;
    for (let current: EvCodeNode | undefined = node; current; current = current.parent_id === null ? undefined : index.get(current.parent_id)) {
      if (current.parent_id === nodeId) return true;
    }
    return false;
  });
}

function belongsToSection(nodeId: string, sectionId: string, index: CodeIndex): boolean {
  const leafSection = leafSectionId(nodeId);
  if (leafSection !== undefined) return leafSection === sectionId;
  return descendsIntoSection(nodeId, sectionId, [...index.values()], index);
}

function summaryRow(code: EvDayView["codes"][number], view: EvDayView, index: CodeIndex): HourSummaryRow {
  const header = columnHeader(code.node_id, index, code.label);
  const cells = view.cells.filter((cell) => cell.node_id === code.node_id);
  const direct = cells.reduce((sum, cell) => sum + toCenti(cell.hours), 0);
  const firmIds = new Set(cells.filter((cell) => cell.kind === "subcontractor").map((cell) => cell.ref_id));
  const firms = view.rows
    .filter((row) => row.kind === "subcontractor" && firmIds.has(row.ref_id))
    .map((row) => row.subcontractor_name ?? row.label);
  const leaf = header.isLeaf ? view.progress?.leaves.find((item) => item.node_id === code.node_id) : undefined;
  const spent = header.isLeaf ? (leaf?.spent_day ?? null) : null;
  const share = spent === null ? 0 : toCenti(spent) - direct;
  return {
    nodeId: code.node_id,
    code: header.code,
    short: header.short,
    isLeaf: header.isLeaf,
    rule: code.rule,
    direct,
    groupShare: share > 0 ? share : 0,
    spent,
    earned: leaf?.earned_day ?? null,
    pf: leaf?.pf_day ?? null,
    firms,
  };
}

/** S6 · Saat Dağıtımı özeti — iş kodu başına tek satır, Kural A gruplu, kod sırası korunur. */
export function hourSummary(view: EvDayView, index: CodeIndex, currentSectionId: string | null): HourSummary {
  const rows = view.codes.map((code) => summaryRow(code, view, index));
  if (currentSectionId === null) return { current: [], others: rows };
  const mine = new Set(
    rows.filter((row) => belongsToSection(row.nodeId, currentSectionId, index)).map((row) => row.nodeId),
  );
  return {
    current: rows.filter((row) => mine.has(row.nodeId)),
    others: rows.filter((row) => !mine.has(row.nodeId)),
  };
}
