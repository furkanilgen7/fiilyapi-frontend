import { describe, it, expect } from "vitest";

import { progressBarWidth } from "./panel-kpi-format";

describe("progressBarWidth", () => {
  it("null → 0", () => {
    expect(progressBarWidth(null)).toBe(0);
  });

  it("normal aralıkta AYNEN (yuvarlanmış) döner", () => {
    expect(progressBarWidth("45.9")).toBe(46);
  });

  it("0'ın ALTI 0'a KIRPILIR", () => {
    expect(progressBarWidth("-5")).toBe(0);
  });

  it("100'ün ÜSTÜ 100'e KIRPILIR (aşım kalemi çubuğu taşmaz)", () => {
    expect(progressBarWidth("142.7")).toBe(100);
  });

  it("tam sınırlar (0, 100) DEĞİŞMEZ", () => {
    expect(progressBarWidth("0")).toBe(0);
    expect(progressBarWidth("100")).toBe(100);
  });
});
