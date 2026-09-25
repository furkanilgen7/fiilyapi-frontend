/**
 * PLN-F2.3 · Miktar tablosu ek kolonları ("Bugün kaz. a-s" · "PF") — SAF.
 *
 * Mockup İ:220-253. Değerler `days/{day}.progress` (motor, §3; taslak günlük
 * dahil K13) payload'ındandır — istemci kazanılmış/PF HESAPLAMAZ. Satır →
 * yaprak eşlemesi B2 `leaf_node_id` biçimidir: `l:<kalem>:<bölüm|none>`.
 */
import type { DiaryLineRef } from "@/components/site-diary/diary-extension";
import type { EvDayProgress } from "@/lib/api/models";
import { roundHalfUp } from "@/lib/earned-value/decimal-input";
import { EMPTY_CELL } from "@/lib/format";

import type { CodeIndex } from "./code-tree";

const NONE_SECTION = "none";
const EARNED_DIGITS = 1;
const LOCALE = "tr-TR";

export function leafNodeIdForLine(line: Pick<DiaryLineRef, "boqItemId" | "sectionId">): string {
  return `l:${line.boqItemId}:${line.sectionId ?? NONE_SECTION}`;
}

/** Kazanılmış a-s: 1 ondalık (İ:625 `nf(e, 1)`), ROUND_HALF_UP. */
export function formatEarned(value: string | null | undefined): string {
  const rounded = roundHalfUp(value, EARNED_DIGITS);
  if (rounded === null) return EMPTY_CELL;
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: EARNED_DIGITS,
    maximumFractionDigits: EARNED_DIGITS,
  }).format(Number(rounded));
}

export interface LineProgress {
  earned: string;
  /** Ham PF (bant `pfBand` ile sunumda, K18); yoksa `null`. */
  pf: string | null;
  /** K12 — oransız yaprak: miktar kaydedilir, kazanılmış hesaplanmaz. */
  noRate: boolean;
}

export function lineProgress(
  line: DiaryLineRef,
  progress: EvDayProgress | null,
  index: CodeIndex,
): LineProgress {
  const nodeId = leafNodeIdForLine(line);
  const noRate = index.get(nodeId)?.has_rate === false;
  const leaf = noRate ? undefined : progress?.leaves.find((l) => l.node_id === nodeId);
  if (leaf === undefined) return { earned: EMPTY_CELL, pf: null, noRate };
  return { earned: formatEarned(leaf.earned_day), pf: leaf.pf_day, noRate };
}
