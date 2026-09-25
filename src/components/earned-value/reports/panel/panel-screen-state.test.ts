import { describe, it, expect } from "vitest";

import { panelScreenState, type PanelScreenStateInput } from "./panel-screen-state";

function input(overrides: Partial<PanelScreenStateInput> = {}): PanelScreenStateInput {
  return {
    siteId: "s-1",
    isForbidden: false,
    isError: false,
    isLoading: false,
    hasBaseline: true,
    hasFieldData: true,
    ...overrides,
  };
}

describe("panelScreenState", () => {
  it("siteId boşsa 'site' — DİĞER hiçbir bayrak ne olursa olsun (sorgu ağa çıkmadan önce)", () => {
    expect(panelScreenState(input({ siteId: "", isError: true, isForbidden: true }))).toBe("site");
  });

  it("403 → 'forbidden', hata bayrağından ÖNCELİKLİ", () => {
    expect(panelScreenState(input({ isForbidden: true, isError: true }))).toBe("forbidden");
  });

  it("diğer hata → 'error'", () => {
    expect(panelScreenState(input({ isError: true }))).toBe("error");
  });

  it("yükleniyor → 'loading'", () => {
    expect(panelScreenState(input({ isLoading: true }))).toBe("loading");
  });

  it("has_baseline=false → 'no-baseline' (a)", () => {
    expect(panelScreenState(input({ hasBaseline: false }))).toBe("no-baseline");
  });

  it("has_baseline=true VE has_field_data=false → 'no-field-data' (b)", () => {
    expect(panelScreenState(input({ hasBaseline: true, hasFieldData: false }))).toBe("no-field-data");
  });

  it("her şey normalse → 'loaded'", () => {
    expect(panelScreenState(input())).toBe("loaded");
  });

  it("hasBaseline/hasFieldData undefined (veri henüz gelmedi) ama loading=false ise 'loaded' YERİNE ekran çökmez — 'loaded' döner, çağıran veri kontrolünü kendi yapar", () => {
    expect(panelScreenState(input({ hasBaseline: undefined, hasFieldData: undefined }))).toBe("loaded");
  });
});
