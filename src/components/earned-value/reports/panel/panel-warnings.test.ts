import { describe, it, expect } from "vitest";

import { filterPanelWarnings, panelWarningHref } from "./panel-warnings";
import type { EvPanelRow } from "./panel-tree";
import type { EvWarning } from "@/lib/api/models";
import type { ReportLinks } from "../kit/report-screen";

function row(nodeId: string | null): EvPanelRow {
  return {
    budget_mhr: "1", contractor_mix: null, contractor_type: null, earned_cum: "1", name: "n", node_id: nodeId,
    parent_id: null, pf_cum: "1", pf_cum_band: "green", pf_week: null, pf_week_band: null, planned_pct_cum: "1",
    progress_pct_cum: "1", scope: "item", spent_cum: "1", status: "normal", uom: null, variance: "0",
  } as EvPanelRow;
}

function warning(overrides: Partial<EvWarning>): EvWarning {
  return { code: "qty_overrun", item_name: null, message: "m", planned_qty: null, qty_cum: null, section_name: null, target: "day", target_id: null, uom: null, value: null, ...overrides } as EvWarning;
}

describe("filterPanelWarnings — S8", () => {
  it("gün hedefli uyarı HER ZAMAN görünür ('tüm şantiye')", () => {
    const warnings = [warning({ target: "day", target_id: "2026-09-24" })];
    expect(filterPanelWarnings(warnings, [])).toHaveLength(1);
  });

  it("node hedefli uyarı yalnız target_id GÖRÜNÜR satırlarda VARSA geçer", () => {
    const visible = [row("d:KAB")];
    expect(filterPanelWarnings([warning({ target: "node", target_id: "d:KAB" })], visible)).toHaveLength(1);
    expect(filterPanelWarnings([warning({ target: "node", target_id: "d:DUV" })], visible)).toHaveLength(0);
  });

  it("leaf hedefli uyarı l:<item>:… → i:<item> GÖRÜNÜR satırlarda VARSA geçer", () => {
    const visible = [row("i:kalip")];
    expect(filterPanelWarnings([warning({ target: "leaf", target_id: "l:kalip:rate-1" })], visible)).toHaveLength(1);
    expect(filterPanelWarnings([warning({ target: "leaf", target_id: "l:demir:rate-2" })], visible)).toHaveLength(0);
  });

  it("target_id null → görünmez (node/leaf hedefinde)", () => {
    expect(filterPanelWarnings([warning({ target: "node", target_id: null })], [row("d:KAB")])).toHaveLength(0);
  });

  it("node_id'si null olan satırlar node/leaf eşleşmesine KATILMAZ", () => {
    const visible = [row(null)];
    expect(filterPanelWarnings([warning({ target: "node", target_id: "d:KAB" })], visible)).toHaveLength(0);
  });
});

describe("panelWarningHref", () => {
  const links: ReportLinks = {
    diary: (day) => `/gunluk-kayit${day ? `?tarih=${day}` : ""}`,
    budget: "/planlama/adam-saat-butcesi",
    dailyReport: (date) => `/planlama/gunluk-rapor${date ? `?tarih=${date}` : ""}`,
    weeklyReport: () => "/planlama/haftalik-qurr",
    panel: "/planlama/panel",
  };

  it("SAAT (undistributed_hours) ve GÜNLÜK (missing_diary) → links.diary", () => {
    expect(panelWarningHref(warning({ code: "undistributed_hours", target: "day", target_id: "2026-09-24" }), links)).toBe(
      "/gunluk-kayit?tarih=2026-09-24",
    );
    expect(panelWarningHref(warning({ code: "missing_diary", target: "day", target_id: "2026-09-21" }), links)).toBe(
      "/gunluk-kayit?tarih=2026-09-21",
    );
  });

  it("PF (pf_out_of_band) → links.dailyReport", () => {
    expect(panelWarningHref(warning({ code: "pf_out_of_band", target: "node", target_id: "d:KAB" }), links)).toBe(
      "/planlama/gunluk-rapor",
    );
  });

  it("MİKTAR (qty_overrun) ve ORAN (empty_rate) → links.budget", () => {
    expect(panelWarningHref(warning({ code: "qty_overrun" }), links)).toBe("/planlama/adam-saat-butcesi");
    expect(panelWarningHref(warning({ code: "empty_rate" }), links)).toBe("/planlama/adam-saat-butcesi");
  });

  it("bilinmeyen kod (destination null) → null (bağlantı basılmaz)", () => {
    expect(panelWarningHref(warning({ code: "unrated_entry" }), links)).toBeNull();
  });

  it("node/leaf hedefli uyarıda link TARİHSİZ açılır (gün belirsiz)", () => {
    const href = panelWarningHref(warning({ code: "undistributed_hours", target: "node", target_id: "d:KAB" }), links);
    expect(href).toBe("/gunluk-kayit");
  });
});
