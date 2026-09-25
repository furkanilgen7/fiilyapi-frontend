import { describe, expect, it } from "vitest";

import type { EvQurrRow, EvQurrTotal } from "@/lib/api/models";

import { buildQurrTree } from "./qurr-tree";
import { QURR_FIXTURE_READY } from "./qurr-fixtures";

function total(over: Partial<EvQurrTotal>): EvQurrTotal {
  return {
    kind: "discipline",
    node_id: null,
    parent_id: null,
    code: null,
    name: "?",
    contractor_mix: null,
    f_prev_budget_mhr: null,
    g_budget_mhr: "0",
    h_earned_cum: "0",
    i_spent_cum: "0",
    j_remaining_mhr: "0",
    k_earned_week: "0",
    l_spent_week: "0",
    q_band: null,
    q_pf_cum: null,
    r_band: null,
    r_pf_week: null,
    ...over,
  };
}

function row(over: Partial<EvQurrRow>): EvQurrRow {
  return {
    a_prev_qty: null,
    b_qty: null,
    c_qty_cum: null,
    changed_budget: false,
    changed_qty: false,
    changed_rate: false,
    code: null,
    contractor_type: null,
    d_remaining_qty: null,
    e_qty_week: null,
    f_prev_budget_mhr: null,
    g_budget_mhr: "0",
    h_earned_cum: "0",
    i_spent_cum: "0",
    is_direct: true,
    j_remaining_mhr: "0",
    k_earned_week: "0",
    l_spent_week: "0",
    level: 3,
    m_prev_unit_mhr: null,
    n_unit_mhr: null,
    name: "?",
    node_id: "row",
    o_actual_unit_mhr_cum: null,
    p_actual_unit_mhr_week: null,
    parent_id: null,
    q_band: null,
    q_pf_cum: null,
    r_band: null,
    r_pf_week: null,
    uom: null,
    ...over,
  };
}

describe("buildQurrTree", () => {
  it("düz totals + rows'u parent_id'den ağaca katlar (disiplin ▸ alt grup ▸ iş tipi)", () => {
    const totals: EvQurrTotal[] = [
      total({ kind: "discipline", node_id: "KAB", name: "Kaba İnşaat" }),
      total({ kind: "group", node_id: "KAB.01", parent_id: "KAB", name: "Betonarme" }),
    ];
    const rows: EvQurrRow[] = [
      row({ node_id: "KAB.01.01", parent_id: "KAB.01", name: "Kalıp" }),
      row({ node_id: "KAB.01.02", parent_id: "KAB.01", name: "Demir" }),
    ];

    const tree = buildQurrTree(rows, totals);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("KAB");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children?.[0].id).toBe("KAB.01");
    expect(tree[0].children?.[0].children).toHaveLength(2);
    expect(tree[0].children?.[0].children?.map((c) => c.id)).toEqual(["KAB.01.01", "KAB.01.02"]);
  });

  it("node_id'siz toplamlar (Σ D / Σ D+DL) kind bazlı sabit kimlik alır, üst düzeyde kalır", () => {
    const totals: EvQurrTotal[] = [
      total({ kind: "direct_total", node_id: null, name: "Doğrudan toplam" }),
      total({ kind: "all_total", node_id: null, name: "Doğrudan + Dolaylı toplam" }),
    ];

    const tree = buildQurrTree([], totals);

    expect(tree).toHaveLength(2);
    expect(tree[0].children).toBeUndefined();
    expect(tree[1].children).toBeUndefined();
    expect(tree[0].id).not.toBe(tree[1].id);
  });

  it("yaprak düğümün children'ı YOKTUR (boş dizi değil, alan hiç basılmaz)", () => {
    const tree = buildQurrTree([row({ node_id: "x", parent_id: null })], []);
    expect(tree[0].children).toBeUndefined();
  });

  // LİDER DÜZELTMESİ (spec §3.15 S3 — "dolaylı kalem KENDİ disiplininde
  // durur"): GEN mockup'taki gibi SIRADAN bir disiplindir (KAB'a
  // TAŞINMAZ — bu, ilk turda mockup'ın KAB toplamını (27.500) bozduğu
  // ÖLÇÜLÜP geri alınan bir düzeltmedir). Sıra: disiplinler (KAB…GEN) →
  // Σ D → Σ D+DL, ikisi EN SONDA ardı ardına (mockup'ın Σ D'yi GEN'den
  // ÖNCE eklediği eski JS artefaktı DEĞİL).
  it("gerçek fikstürle: kök sırası backend totals[] dizisiyle AYNI (KAB…ELK, GEN, Σ D, Σ D+DL)", () => {
    const tree = buildQurrTree(QURR_FIXTURE_READY.rows, QURR_FIXTURE_READY.totals);
    expect(tree.map((n) => n.id)).toEqual([
      "KAB",
      "DUV",
      "MEK",
      "ELK",
      "GEN",
      "qurr-total-direct_total-11",
      "qurr-total-all_total-12",
    ]);
    const kab = tree[0];
    expect(kab.children?.map((c) => c.id)).toEqual(["KAB.01"]);
    expect(kab.children?.[0].children?.map((c) => c.id)).toEqual(["KAB.01.01", "KAB.01.02", "KAB.01.03"]);
    const gen = tree.find((n) => n.id === "GEN");
    expect(gen?.children?.map((c) => c.id)).toEqual(["GEN.01"]);
    expect(gen?.children?.[0].children?.map((c) => c.id)).toEqual(["GEN.01.01", "GEN.01.02"]);
  });
});
