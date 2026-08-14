import { describe, it, expect } from "vitest";

import { usageBarWidth, usageReasonText, usageTone } from "./usage-tone";

// F-MK T4 · K2 — bu modül SUNUCUNUN yüzdesini boyar; hiçbir yerde
// `hours / capacity` hesabı YOKTUR (fonksiyonun tek girdisi `usage_pct`tir).

describe("usageTone — eşik TEK YERDE, girdi yalnız sunucunun yüzdesi", () => {
  it("mockup satırlarının tonunu üretir", () => {
    expect(usageTone("93.00")).toBe("success"); // M3:131
    expect(usageTone("84.00")).toBe("primary"); // M3:170
    expect(usageTone("76.00")).toBe("primary"); // M3:144
    expect(usageTone("21.00")).toBe("danger"); // M3:157
    expect(usageTone("0.00")).toBe("warning"); // M3:183
  });

  it("`null` renk iddiası taşımaz (K3 — '—' basılacak)", () => {
    expect(usageTone(null)).toBe("neutral");
  });

  it("sayıya çevrilemeyen değer sessizce 0 sayılmaz", () => {
    expect(usageTone("abc")).toBe("neutral");
  });
});

describe("usageBarWidth", () => {
  it("0-100 aralığına kırpar", () => {
    expect(usageBarWidth("93.00")).toBe(93);
    expect(usageBarWidth("140")).toBe(100);
    expect(usageBarWidth("-5")).toBe(0);
  });

  it("`null` girdi çubuk ÜRETMEZ (0 genişlik bile değil)", () => {
    expect(usageBarWidth(null)).toBeNull();
  });
});

describe("usageReasonText", () => {
  it("sunucunun gerekçe damgasını Türkçe ipucuna çevirir", () => {
    expect(usageReasonText("no_capacity_hours")).toContain("kapasite saati");
  });

  it("gerekçesiz `null` için de bir metin verir (sessiz hücre yok)", () => {
    expect(usageReasonText(null).length).toBeGreaterThan(0);
  });
});
