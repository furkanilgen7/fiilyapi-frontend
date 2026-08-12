// @vitest-environment node
// stock-entry-form.css.test.ts ile aynı gerekçe: dosya sistemi okuyan saf METİN
// testi. Kuralın stylesheet'te VAR olduğunu doğrular; cascade'i/tarayıcı
// görünümünü DOĞRULAMAZ (görsel doğrulama T4'ün işi). Amaç DS'ye bağlı renk/ölçü
// kararlarının sessizce silinmesine karşı regresyondur.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./sales-form.css", import.meta.url)), "utf8");

describe("sales-form.css — DS mockup'ına bağlı kurallar", () => {
  it("ünite bilgi şeridi mor tint zemin + mor etiket (58-59)", () => {
    expect(css).toMatch(/\.sf-unit-info\s*{[^}]*var\(--color-accent-purple-tint\)/);
    expect(css).toMatch(/\.sf-unit-info__label\s*{[^}]*var\(--color-accent-purple\)/);
  });

  it("'Bu Satıştan Kâr' kutusu yeşil zemin + yeşil tutar (89-91)", () => {
    expect(css).toMatch(/\.sf-profit\s*{[^}]*var\(--color-success-tint\)/);
    expect(css).toMatch(/\.sf-profit__amount\s*{[^}]*var\(--color-success\)/);
  });

  it("satış bedeli girişi mor vurguludur (86)", () => {
    expect(css).toMatch(/\.sf-price-emphasis\s*{[^}]*var\(--color-accent-purple-border\)/);
  });

  it("plan TOPLAM şeridi mor zemin + üstten 2px mor çizgidir (143-145)", () => {
    expect(css).toMatch(
      /\.sf-plan-table tfoot tr\s*{[^}]*var\(--color-accent-purple-tint\)[^}]*2px solid var\(--color-accent-purple-grad-start\)/,
    );
  });

  it("peşinat satırı yeşildir (117-118)", () => {
    expect(css).toMatch(/\.sf-plan-table tr\.sf-plan-row--down\s*{[^}]*var\(--color-success-tint\)/);
  });

  it("sayısal hücreler mono ailededir (59, 84-86, 121, 145)", () => {
    for (const selector of ["sf-unit-info__value", "sf-amount-input", "sf-plan-table__amount"]) {
      expect(css, selector).toMatch(new RegExp(`\\.${selector}\\s*{[^}]*var\\(--font-mono\\)`));
    }
  });

  it("çıplak hex renk yoktur (token zorunluluğu)", () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
