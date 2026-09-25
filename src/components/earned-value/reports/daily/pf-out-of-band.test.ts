import { describe, expect, it } from "vitest";

import type { EvQtyTreeRow, EvWarning } from "@/lib/api/models";

import { pfOutOfBandRows } from "./pf-out-of-band";

function warning(target_id: string | null, over: Partial<EvWarning> = {}): EvWarning {
  return {
    code: "pf_out_of_band",
    target: "leaf",
    target_id,
    message: "günlük PF bant dışı",
    value: "0.50",
    ...over,
  };
}

function row(node_id: string, level: number, name: string, over: Partial<EvQtyTreeRow> = {}): EvQtyTreeRow {
  return {
    node_id,
    level,
    name,
    uom: level === 3 ? "m²" : null,
    contractor_type: null,
    is_direct: level === 3 ? true : null,
    pf_day: "0.50",
    pf_day_band: "red",
    pf_cum: "0.61",
    pf_cum_band: "red",
    planned_qty: null,
    planned_unit_mhr: null,
    progress_pct_cum: null,
    qty_cum: null,
    qty_day: null,
    remaining_qty: null,
    spent_day: "0",
    actual_unit_mhr_cum: null,
    actual_unit_mhr_day: null,
    ...over,
  };
}

describe("pfOutOfBandRows — GİR PF bant dışı tablosu (uyarı ↔ quantities birleşimi)", () => {
  const quantities = [row("d:KAB", 1, "Kaba İnşaat"), row("i:demir", 3, "Demir", { pf_day: "0.50", pf_cum: "0.61", pf_cum_band: "red" })];

  it("target_id eşleşince kalem adı + günlük/kümülatif PF + bant quantities'ten gelir", () => {
    const rows = pfOutOfBandRows([warning("i:demir")], quantities);
    expect(rows).toEqual([
      { key: "i:demir", itemName: "Demir", disciplineName: "Kaba İnşaat", dayValue: "0.50", dayBand: "red", cumValue: "0.61", cumBand: "red" },
    ]);
  });

  it("disiplin adı, en yakın L1 (level=1) atadan türetilir (DFS ön-sıra)", () => {
    const q = [row("d:ELK", 1, "Elektrik"), row("i:buat", 2, "Kuvvetli akım"), row("i:priz", 3, "Buat/priz", { pf_cum: "0.4" })];
    const rows = pfOutOfBandRows([warning("i:priz")], q);
    expect(rows[0].disciplineName).toBe("Elektrik");
  });

  it("target_id quantities'te YOKSA (silinmiş kalem) → uyarının message'ı basılır, PF'ler null/none", () => {
    const rows = pfOutOfBandRows([warning("i:yok", { item_name: null, message: "Silinmiş kalem" })], quantities);
    expect(rows).toEqual([
      { key: "i:yok-0", itemName: "Silinmiş kalem", disciplineName: null, dayValue: "0.50", dayBand: "none", cumValue: null, cumBand: "none" },
    ]);
  });

  it("target_id null → eşleşmeyen dal, çökmez", () => {
    const rows = pfOutOfBandRows([warning(null)], quantities);
    expect(rows[0].dayBand).toBe("none");
  });

  it("pf_out_of_band DIŞI uyarılar filtrelenir", () => {
    const rows = pfOutOfBandRows(
      [warning("i:demir"), { code: "undistributed_hours", target: "day", target_id: null, message: "x" }],
      quantities,
    );
    expect(rows).toHaveLength(1);
  });

  it("pf_cum_band yoksa (null) → reportBand 'none' döner", () => {
    const q = [row("i:demir", 3, "Demir", { pf_cum_band: null })];
    const rows = pfOutOfBandRows([warning("i:demir")], q);
    expect(rows[0].cumBand).toBe("none");
  });
});
