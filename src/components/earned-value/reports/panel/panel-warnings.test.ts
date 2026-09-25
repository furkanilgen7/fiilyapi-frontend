import { describe, it, expect } from "vitest";

import { filterPanelWarnings, groupMissingDiaryWarnings, groupPfOutOfBandWarnings, panelWarningHref } from "./panel-warnings";
import type { EvPanelRow } from "./panel-tree";
import type { EvWarning } from "@/lib/api/models";
import type { ReportLinks } from "../kit/report-screen";

function row(nodeId: string | null, name = "n"): EvPanelRow {
  return {
    budget_mhr: "1", contractor_mix: null, contractor_type: null, earned_cum: "1", name, node_id: nodeId,
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

/**
 * PLN-F3.6b LİDER PLANI §1.1/§4 · backend her bant dışı kalem için AYRI bir
 * `pf_out_of_band` uyarısı üretir; bu fonksiyon onları TEK karta toplar.
 */
describe("groupPfOutOfBandWarnings", () => {
  const links: ReportLinks = {
    diary: (day) => `/gunluk-kayit${day ? `?tarih=${day}` : ""}`,
    budget: "/planlama/adam-saat-butcesi",
    dailyReport: (date) => `/planlama/gunluk-rapor${date ? `?tarih=${date}` : ""}`,
    weeklyReport: () => "/planlama/haftalik-qurr",
    panel: "/planlama/panel",
  };
  const rows = [row("i:ic-siva", "İç sıva"), row("i:tugla-duvar", "Tuğla duvar"), row("i:temiz-su-borusu", "Temiz su borusu")];

  it("hiç pf_out_of_band yoksa null döner (uydurma '0 kalem' YOK)", () => {
    expect(groupPfOutOfBandWarnings([warning({ code: "qty_overrun" })], rows, "0.95", links)).toBeNull();
  });

  it("üç ayrı uyarıyı TEK grup mesajına toplar: 'N kalem PF bant dışı (< eşik)'", () => {
    const warnings = [
      warning({ code: "pf_out_of_band", target: "node", target_id: "i:ic-siva", value: "0.84" }),
      warning({ code: "pf_out_of_band", target: "node", target_id: "i:tugla-duvar", value: "0.88" }),
      warning({ code: "pf_out_of_band", target: "node", target_id: "i:temiz-su-borusu", value: "0.93" }),
    ];
    const group = groupPfOutOfBandWarnings(warnings, rows, "0.95", links);
    expect(group?.count).toBe(3);
    expect(group?.message).toBe("3 kalem PF bant dışı (< 0,95)");
  });

  it("ad rows[node_id===target_id] BİRLEŞİMİNDEN gelir (item_name'den DEĞİL)", () => {
    const warnings = [warning({ code: "pf_out_of_band", target: "node", target_id: "i:ic-siva", item_name: "YANLIŞ AD", value: "0.84" })];
    const group = groupPfOutOfBandWarnings(warnings, rows, "0.95", links);
    expect(group?.detail).toBe("İç sıva 0,84");
  });

  it("rows'ta eşleşme YOKSA item_name YEDEĞİNE düşer", () => {
    const warnings = [warning({ code: "pf_out_of_band", target: "node", target_id: "i:yok", item_name: "Yedek Ad", value: "0.70" })];
    const group = groupPfOutOfBandWarnings(warnings, rows, "0.95", links);
    expect(group?.detail).toBe("Yedek Ad 0,70");
  });

  it("bağlantı ilk uyarının hedefinden çözülür (links.dailyReport)", () => {
    const warnings = [warning({ code: "pf_out_of_band", target: "node", target_id: "i:ic-siva", value: "0.84" })];
    const group = groupPfOutOfBandWarnings(warnings, rows, "0.95", links);
    expect(group?.href).toBe("/planlama/gunluk-rapor");
  });
});

/**
 * PLN-F3.6b LİDER DENETİMİ · `groupPfOutOfBandWarnings` İLE AYNI DESEN —
 * backend her gönderilmemiş GÜN için AYRI bir `missing_diary` uyarısı üretir.
 */
describe("groupMissingDiaryWarnings", () => {
  const links: ReportLinks = {
    diary: (day) => `/gunluk-kayit${day ? `?tarih=${day}` : ""}`,
    budget: "/planlama/adam-saat-butcesi",
    dailyReport: (date) => `/planlama/gunluk-rapor${date ? `?tarih=${date}` : ""}`,
    weeklyReport: () => "/planlama/haftalik-qurr",
    panel: "/planlama/panel",
  };

  it("hiç missing_diary yoksa null döner (uydurma '0 gün' YOK)", () => {
    expect(groupMissingDiaryWarnings([warning({ code: "qty_overrun" })], links)).toBeNull();
  });

  it("iki ayrı günü TEK grup mesajına toplar: 'N günlük gönderilmedi' + tarih+gün adı listesi + kuyruk", () => {
    const warnings = [
      warning({ code: "missing_diary", target: "day", target_id: "2026-09-21" }), // Pazartesi
      warning({ code: "missing_diary", target: "day", target_id: "2026-09-23" }), // Çarşamba
    ];
    const group = groupMissingDiaryWarnings(warnings, links);
    expect(group?.count).toBe(2);
    expect(group?.message).toBe("2 günlük gönderilmedi");
    expect(group?.detail).toBe("21.09.2026 Pzt · 23.09.2026 Çar — gün kilitlenmedi");
  });

  it("bağlantı ilk günden çözülür (links.diary, tarihli)", () => {
    const warnings = [warning({ code: "missing_diary", target: "day", target_id: "2026-09-21" })];
    const group = groupMissingDiaryWarnings(warnings, links);
    expect(group?.href).toBe("/gunluk-kayit?tarih=2026-09-21");
  });
});
