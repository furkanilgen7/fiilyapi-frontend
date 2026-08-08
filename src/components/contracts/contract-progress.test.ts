import { describe, it, expect } from "vitest";

import { contractProgressTone, contractProgressWidth } from "./contract-progress";

/**
 * Eşik kuralı mockup'ın BEŞ örnek satırından çıkarıldı (bkz. modül başlığı);
 * bu test o beş satırı kanıt olarak sabitler — kural değişirse kırmızıya döner.
 */
describe("contractProgressTone — SZL 60/70/80/90/100", () => {
  it.each([
    [75, "mid"], // 60 · mavi
    [100, "complete"], // 70 · yeşil (ray zemini de yeşil)
    [58, "mid"], // 80 · mavi
    [42, "low"], // 90 · kehribar
    [88, "high"], // 100 · mor
  ])("%%%s → %s", (pct, tone) => {
    expect(contractProgressTone(pct)).toBe(tone);
  });

  it("eşik sınırlarında kararlıdır", () => {
    expect(contractProgressTone(50)).toBe("mid");
    expect(contractProgressTone(49.9)).toBe("low");
    expect(contractProgressTone(80)).toBe("high");
    expect(contractProgressTone(79.9)).toBe("mid");
    expect(contractProgressTone(0)).toBe("low");
  });

  it("100'ün üstünde de tamamlandı tonundadır (backend aşım döndürebilir)", () => {
    expect(contractProgressTone(112)).toBe("complete");
  });
});

describe("contractProgressWidth", () => {
  it("yüzdeyi CSS genişliğine çevirir", () => {
    expect(contractProgressWidth(75)).toBe("75%");
  });

  it("0-100 aralığına kırpar — çubuk rayından TAŞMAZ", () => {
    expect(contractProgressWidth(140)).toBe("100%");
    expect(contractProgressWidth(-3)).toBe("0%");
  });
});
