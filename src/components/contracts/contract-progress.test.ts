import { describe, it, expect } from "vitest";

import {
  contractProgressFillStyle,
  contractProgressTone,
  contractProgressWidth,
} from "./contract-progress";

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

  // 🔴 F-SUBPX-3 (lider denetimi) · `round()` KESİNLİKLE burada YAZILMAZ.
  // `round()`u inline `width`e yazmak, onu DESTEKLEMEYEN bir tarayıcıda TÜM
  // bildirimi geçersiz kılar ve çubuk genişliksiz (görünmez) kalır — geri
  // düşüş SADECE stylesheet'teki `@supports` bloğunda yaşayabilir (bkz.
  // `contractProgressFillStyle` ve CSS bekçileri altta). Bu test, fonksiyonun
  // HİÇBİR ZAMAN `round(`/`calc(`/`clamp(` gibi bir CSS işlevine SARILMADIĞINI
  // — dâimâ çıplak `"NN%"` döndürdüğünü — bekçiler.
  it("HİÇBİR CSS işlevine sarılmaz — dâimâ çıplak yüzde döner (bekçi)", () => {
    for (const pct of [0, 1, 41.666666, 58, 75, 99.99, 100, -10, 250]) {
      const width = contractProgressWidth(pct);
      expect(width, `${pct} → ${width}`).toMatch(/^-?\d+(\.\d+)?%$/);
    }
  });
});

describe("contractProgressFillStyle", () => {
  it("`width` YAZMAZ, yalnız `--contract-progress-width` özel özelliğini yazar", () => {
    const style = contractProgressFillStyle(41.666666);
    expect(style).toEqual({ "--contract-progress-width": "41.666666%" });
    expect(style).not.toHaveProperty("width");
  });

  it("0-100 aralığına kırpılmış değeri taşır", () => {
    expect(contractProgressFillStyle(140)["--contract-progress-width"]).toBe("100%");
    expect(contractProgressFillStyle(-3)["--contract-progress-width"]).toBe("0%");
  });
});
