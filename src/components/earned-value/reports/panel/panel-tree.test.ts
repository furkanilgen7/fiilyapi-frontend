import { describe, it, expect } from "vitest";

import { buildPanelTree, panelDefaultExpanded, panelRowNodeId } from "./panel-tree";
import type { EvPanelRow } from "./panel-tree";

function row(overrides: Partial<EvPanelRow>): EvPanelRow {
  return {
    budget_mhr: "100",
    contractor_mix: null,
    contractor_type: null,
    earned_cum: "50",
    name: "r",
    node_id: null,
    parent_id: null,
    pf_cum: "1.00",
    pf_cum_band: "green",
    pf_week: null,
    pf_week_band: null,
    planned_pct_cum: "50",
    progress_pct_cum: "50",
    scope: "overall",
    spent_cum: "50",
    status: "normal",
    uom: null,
    variance: "0",
    ...overrides,
  } as EvPanelRow;
}

describe("panelRowNodeId", () => {
  it("node_id doluysa AYNEN kullanılır", () => {
    expect(panelRowNodeId(row({ node_id: "d:KAB" }), 0)).toBe("d:KAB");
  });

  it("node_id null ise scope+index'ten SABİT bir kimlik türetilir", () => {
    expect(panelRowNodeId(row({ node_id: null, scope: "overall" }), 2)).toBe("panel-row-overall-2");
  });
});

describe("buildPanelTree", () => {
  it("parent_id null olan satırlar KÖKTÜR", () => {
    const rows = [row({ node_id: "genel", parent_id: null, scope: "overall" })];
    const tree = buildPanelTree(rows);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe("genel");
  });

  it("parent_id dolu satırlar İLGİLİ ebeveynin children'ına GİRER", () => {
    const rows = [
      row({ node_id: "genel", parent_id: null, scope: "overall" }),
      row({ node_id: "d:KAB", parent_id: "genel", scope: "discipline", name: "Kaba İnşaat" }),
      row({ node_id: "i:kalip", parent_id: "d:KAB", scope: "item", name: "Kalıp" }),
    ];
    const tree = buildPanelTree(rows);
    expect(tree[0]!.children).toHaveLength(1);
    expect(tree[0]!.children![0]!.id).toBe("d:KAB");
    expect(tree[0]!.children![0]!.children).toHaveLength(1);
    expect(tree[0]!.children![0]!.children![0]!.id).toBe("i:kalip");
  });

  it("node_id'siz İKİ toplama satırı (Genel–Kendi, Genel–Taşeron) ÇAKIŞMAZ — scope+index'ten AYRI kimlik alır", () => {
    const rows = [
      row({ node_id: null, parent_id: null, scope: "overall_own", name: "Genel – Kendi" }),
      row({ node_id: null, parent_id: null, scope: "overall_subcon", name: "Genel – Taşeron" }),
    ];
    const tree = buildPanelTree(rows);
    expect(tree).toHaveLength(2);
    expect(new Set(tree.map((n) => n.id)).size).toBe(2);
  });

  it("boş dizi → boş ağaç (çökmez)", () => {
    expect(buildPanelTree([])).toEqual([]);
  });

  it("sıra GİRDİ SIRASINI korur (kardeşler arası yeniden sıralama YAPILMAZ)", () => {
    const rows = [
      row({ node_id: "genel", parent_id: null }),
      row({ node_id: "d:B", parent_id: "genel", name: "B disiplini" }),
      row({ node_id: "d:A", parent_id: "genel", name: "A disiplini" }),
    ];
    const tree = buildPanelTree(rows);
    expect(tree[0]!.children!.map((c) => c.id)).toEqual(["d:B", "d:A"]);
  });
});

/**
 * PLN-F3.6b LİDER DÜZELTMESİ (Panel.dc.html:454 `open: { KAB: true }`) —
 * disiplin süzgeci yoksa SIRADAKİ İLK disiplin açık gelir, süzgeç varsa
 * SEÇİLİ disiplin açık gelir.
 */
describe("panelDefaultExpanded", () => {
  const DISCIPLINE_ROWS = [
    row({ node_id: "genel", parent_id: null, scope: "overall" }),
    row({ node_id: "d:KAB", parent_id: null, scope: "discipline", name: "Kaba İnşaat" }),
    row({ node_id: "d:DUV", parent_id: null, scope: "discipline", name: "Duvar & Sıva" }),
  ];

  it("süzgeç yok → SIRADAKİ İLK disiplin açık gelir", () => {
    expect(panelDefaultExpanded(DISCIPLINE_ROWS, null)).toEqual(["d:KAB"]);
  });

  it("süzgeç VAR → SEÇİLİ disiplin açık gelir (ilk disiplin DEĞİL)", () => {
    expect(panelDefaultExpanded(DISCIPLINE_ROWS, "d:DUV")).toEqual(["d:DUV"]);
  });

  it("seçili disiplin satırlarda YOKSA boş küme döner (çökmez)", () => {
    expect(panelDefaultExpanded(DISCIPLINE_ROWS, "d:YOK")).toEqual([]);
  });

  it("hiç disiplin satırı yoksa (yalnız Genel) boş küme döner", () => {
    expect(panelDefaultExpanded([row({ node_id: "genel", parent_id: null, scope: "overall" })], null)).toEqual([]);
  });
});
