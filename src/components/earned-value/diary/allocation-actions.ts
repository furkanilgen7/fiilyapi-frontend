/**
 * PLN-F2.3 · Saat Dağıtımı araç çubuğu eylemleri — SAF (girdi taslak DEĞİŞMEZ).
 *
 * Mockup İ:712 (Dünkü dağılımı kopyala), İ:713 (Kalanı orantılı dağıt),
 * İ:718 (Seçili kişilere toplu ata). B2-7: backend yalnız son GÖNDERİLMİŞ
 * günün PAYLARINI verir; doldurma/ölçekleme istemcidedir (0,5 sa adım).
 */
import type { EvDayRow, EvPreviousAllocation } from "@/lib/api/models";

import {
  columnTotals,
  ensureCode,
  keyOfRow,
  rowRemaining,
  setCell,
  type AllocationDraft,
  type AllocationRule,
  type RowKey,
} from "./allocation-model";
import { formatHoursInput, parseHoursInput, type Centi } from "./hours";

/** 0,5 sa = 50 centi (İ:713 `Math.floor(… * 2) / 2`). */
const HALF_HOUR: Centi = 50;

export interface ActionResult {
  draft: AllocationDraft;
}

/**
 * `total`u ağırlıklara 0,5 sa adımıyla (aşağı) böler; adıma sığmayan artık
 * EN BÜYÜK ağırlığa eklenir — toplam hiçbir zaman kaybolmaz (İ:713 `mi`).
 */
export function splitByWeights(total: Centi, weights: readonly number[]): Centi[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  if (sum <= 0) return weights.map(() => 0);
  const parts = weights.map((weight) => Math.floor((total * weight) / sum / HALF_HOUR) * HALF_HOUR);
  const given = parts.reduce((acc, part) => acc + part, 0);
  const largest = weights.indexOf(Math.max(...weights));
  return parts.map((part, index) => (index === largest ? part + total - given : part));
}

function addToCell(draft: AllocationDraft, key: RowKey, nodeId: string, add: Centi): AllocationDraft {
  if (add === 0) return draft;
  const current = parseHoursInput(draft.cells[key]?.[nodeId] ?? "") ?? 0;
  return setCell(draft, key, nodeId, formatHoursInput(current + add));
}

function ruleOf(prev: EvPreviousAllocation, nodeId: string): AllocationRule {
  return prev.codes.find((code) => code.node_id === nodeId)?.rule ?? "direct";
}

/**
 * B2-7 · son gönderilmiş günün desenini BUGÜNÜN kalan saatiyle ölçekler.
 * Yalnız boş/eksik satırlar (kalan > 0) doldurulur; tam dağıtılmış satıra
 * dokunulmaz (İ:712 bildirimi). `isAllowed` oransız/ağaçta olmayan kodu eler
 * (backend 422 verirdi); elenen pay kalanlara yeniden bölünür.
 */
export function copyPreviousPattern(
  draft: AllocationDraft,
  prev: EvPreviousAllocation,
  rows: readonly EvDayRow[],
  isAllowed: (nodeId: string) => boolean,
): ActionResult & { filledRows: number } {
  let next = draft;
  let filledRows = 0;
  for (const row of rows) {
    const remaining = rowRemaining(next, row);
    const pattern = prev.rows.find((p) => p.kind === row.kind && p.ref_id === row.ref_id);
    const shares = (pattern?.shares ?? []).filter((share) => isAllowed(share.node_id));
    if (remaining <= 0 || shares.length === 0) continue;
    const adds = splitByWeights(remaining, shares.map((share) => Number(share.share)));
    shares.forEach((share, index) => {
      next = ensureCode(next, share.node_id, ruleOf(prev, share.node_id));
      next = addToCell(next, keyOfRow(row), share.node_id, adds[index]);
    });
    filledRows += 1;
  }
  return { draft: next, filledRows };
}

/**
 * İ:713 · her satırın KALANINI orantılı dağıtır: taban satırın kendi
 * dağılımıdır; satır boşsa kolon toplamları (ekibin bugünkü dağılımı).
 * Taban yoksa satıra dokunulmaz. Kalan ≤ 0 satır atlanır.
 */
export function distributeRemaining(
  draft: AllocationDraft,
  rows: readonly EvDayRow[],
): ActionResult & { changedRows: number } {
  const totals = columnTotals(draft, rows);
  let next = draft;
  let changedRows = 0;
  for (const row of rows) {
    const remaining = rowRemaining(next, row);
    if (remaining <= 0) continue;
    const key = keyOfRow(row);
    const own = draft.codes.map((code) => parseHoursInput(draft.cells[key]?.[code.node_id] ?? "") ?? 0);
    const base = own.some((value) => value > 0) ? own : draft.codes.map((code) => totals[code.node_id] ?? 0);
    if (!base.some((value) => value > 0)) continue;
    const adds = splitByWeights(remaining, base);
    draft.codes.forEach((code, index) => {
      next = addToCell(next, key, code.node_id, adds[index]);
    });
    changedRows += 1;
  }
  return { draft: next, changedRows };
}

/** İ:718 · seçili satırların hedef koduna saati YAZAR (mevcut değerin yerine). */
export function bulkAssign(
  draft: AllocationDraft,
  keys: readonly RowKey[],
  nodeId: string,
  text: string,
): AllocationDraft {
  return keys.reduce((next, key) => setCell(next, key, nodeId, text), draft);
}
