import { describe, expect, it } from "vitest";

import type { EvQtyTreeRow } from "@/lib/api/models";

import { buildQuantityTree } from "./quantity-tree";

function row(node_id: string, level: number, name: string): EvQtyTreeRow {
  return {
    node_id,
    level,
    name,
    uom: "m²",
    contractor_type: null,
    is_direct: true,
    pf_day: null,
    pf_day_band: null,
    planned_qty: null,
    planned_unit_mhr: null,
    progress_pct_cum: null,
    qty_cum: null,
    qty_day: null,
    remaining_qty: null,
    spent_day: "0",
    actual_unit_mhr_cum: null,
    actual_unit_mhr_day: null,
  };
}

describe("buildQuantityTree — GİR miktar tablosu L1/L2/L3 (DFS ön-sıra + level)", () => {
  it("boş liste → boş ağaç", () => {
    expect(buildQuantityTree([])).toEqual([]);
  });

  it("tek seviye (hepsi L1) → düz kök listesi, çocuksuz", () => {
    const rows = [row("d1", 1, "Kaba İnşaat"), row("d2", 1, "Duvar")];
    const tree = buildQuantityTree(rows);
    expect(tree).toHaveLength(2);
    expect(tree[0].children).toBeUndefined();
    expect(tree[1].id).toBe("d2");
  });

  it("L1 > L2 > L3 iç içe kurulur (mockup Betonarme > Kalıp deseni)", () => {
    const rows = [
      row("d1", 1, "Kaba İnşaat"),
      row("d1-s1", 2, "Betonarme"),
      row("d1-s1-i1", 3, "Kalıp"),
      row("d1-s1-i2", 3, "Demir"),
    ];
    const tree = buildQuantityTree(rows);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("d1");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children![0].id).toBe("d1-s1");
    expect(tree[0].children![0].children).toHaveLength(2);
    expect(tree[0].children![0].children![0].id).toBe("d1-s1-i1");
    expect(tree[0].children![0].children![1].id).toBe("d1-s1-i2");
  });

  it("kardeş L1 disiplinler birbirinin çocuğu OLMAZ (yığın doğru dışa katlanır)", () => {
    const rows = [
      row("d1", 1, "Kaba İnşaat"),
      row("d1-s1", 2, "Betonarme"),
      row("d2", 1, "Elektrik"),
      row("d2-s1", 2, "Kuvvetli akım"),
    ];
    const tree = buildQuantityTree(rows);
    expect(tree).toHaveLength(2);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[1].id).toBe("d2");
    expect(tree[1].children).toHaveLength(1);
    expect(tree[1].children![0].id).toBe("d2-s1");
  });

  it("girdi diziyi DEĞİŞTİRMEZ", () => {
    const rows = [row("d1", 1, "Kaba İnşaat")];
    const copy = [...rows];
    buildQuantityTree(rows);
    expect(rows).toEqual(copy);
  });
});
