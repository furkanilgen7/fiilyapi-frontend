import type { EvQtyTreeRow, EvWarning } from "@/lib/api/models";
import { reportBand, type PfBand } from "@/lib/earned-value";

/**
 * PLN-F3.4 · GİR "PF bant dışı kalemler" tablosu — GİR:282-294 (ekran),
 * 371-378 (yazdırma). Backend `warnings[code=pf_out_of_band]` yalnız
 * GÜNLÜK değeri taşır (`WarningOut.value`); KÜMÜLATİF PF `quantities[]`
 * içindeki AYNI yaprağın `pf_cum`/`pf_cum_band`ındadır (`QtyTreeRow.pf_cum`
 * şemada VAR — F3-SÖZLEŞME §0). Bu SAF fonksiyon uyarıyı `target_id` ↔
 * `quantities[].node_id` üzerinden birleştirir ve disiplin (L1) adını,
 * DFS ön-sıradaki en yakın `level === 1` atadan türetir.
 *
 * Eşleşmeyen hedef (`target_id` `quantities` içinde yok — silinmiş kalem,
 * ya da `target_id === null`): kalem adı yerine uyarının `message`i basılır,
 * PF değerleri boş (`dayValue`/`cumValue` `null`, bant `"none"`).
 */
export interface PfOutOfBandRow {
  key: string;
  itemName: string;
  disciplineName: string | null;
  dayValue: string | null;
  dayBand: PfBand;
  cumValue: string | null;
  cumBand: PfBand;
}

function disciplineIndex(quantities: readonly EvQtyTreeRow[]): ReadonlyMap<string, string> {
  const index = new Map<string, string>();
  let currentDiscipline: string | null = null;
  for (const row of quantities) {
    if (row.level === 1) currentDiscipline = row.name;
    if (currentDiscipline !== null) index.set(row.node_id, currentDiscipline);
  }
  return index;
}

export function pfOutOfBandRows(
  warnings: readonly EvWarning[],
  quantities: readonly EvQtyTreeRow[],
): PfOutOfBandRow[] {
  const byNodeId = new Map(quantities.map((row) => [row.node_id, row] as const));
  const disciplineOf = disciplineIndex(quantities);

  return warnings
    .filter((w) => w.code === "pf_out_of_band")
    .map((w, index) => {
      const row = w.target_id === null ? undefined : byNodeId.get(w.target_id);
      if (row === undefined) {
        return {
          key: `${w.target_id ?? "warning"}-${index}`,
          itemName: w.item_name ?? w.message,
          disciplineName: w.section_name ?? null,
          dayValue: w.value ?? null,
          dayBand: "none",
          cumValue: null,
          cumBand: "none",
        };
      }
      return {
        key: row.node_id,
        itemName: row.name,
        disciplineName: disciplineOf.get(row.node_id) ?? null,
        dayValue: row.pf_day,
        dayBand: reportBand(row.pf_day_band),
        cumValue: row.pf_cum ?? null,
        cumBand: reportBand(row.pf_cum_band),
      };
    });
}
