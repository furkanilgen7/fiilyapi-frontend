// @vitest-environment node
// KAPSAM UYARISI (contracts.css.test.ts ile aynı): bu dosya YALNIZCA
// stylesheet METNİNDE ilgili kuralın var olduğunu doğrular; cascade'i ya da
// tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T8'in işi). Amaç,
// mockup'a bağlı renk/ölçü kararlarının sessizce silinmesine karşı regresyon
// korumasıdır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./subcontractor-contract-form.css", import.meta.url)),
  "utf8",
);

describe("subcontractor-contract-form.css — FSO mockup'ına bağlı kurallar", () => {
  it("138 · Taşeron B.F. hücresi SARI vurguludur", () => {
    expect(css).toMatch(
      /\.fso-items__price-input\s*{[^}]*var\(--color-warning-border-soft\)[^}]*var\(--color-amber-tint-cell\)/,
    );
  });

  it("127/128 · başlık renkleri kolona özeldir (kehribar · yeşil)", () => {
    expect(css).toMatch(/\.fso-items__th--star\s*{[^}]*var\(--color-warning-strong\)/);
    expect(css).toMatch(/\.fso-items__th--total\s*{[^}]*var\(--color-success\)/);
  });

  it("132/160 · iki grup tonu da tanımlıdır (mavi · yeşil)", () => {
    expect(css).toMatch(/\.fso-items__group-row\s*{[^}]*var\(--color-nav-active-bg\)/);
    expect(css).toMatch(/\.fso-items__group-row--alt\s*{[^}]*var\(--color-success-tint\)/);
  });

  it("180-182 · toplam şeridi kehribar zemin + 2px üst çizgi taşır", () => {
    expect(css).toMatch(
      /\.fso-items__foot-row\s*{[^}]*var\(--color-amber-tint-cell\)[^}]*var\(--border-width-total\)/,
    );
    expect(css).toMatch(/\.fso-items__foot-cell--value\s*{[^}]*var\(--color-warning\)/);
  });

  it("'girilmedi' hücresi para biçiminden ÇIKAR (yeşil/mono değil)", () => {
    expect(css).toMatch(/\.fso-items__td--missing\s*{[^}]*var\(--color-text-subtle\)/);
  });

  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
