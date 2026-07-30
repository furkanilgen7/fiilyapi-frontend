// @vitest-environment node
// Saf metin regresyon koruması (tokens.test.ts / project-detail.css.test.ts
// deseni): stylesheet'in TOKEN disiplinini kapıya bağlar. Gerçek görsel çıktı
// Linux CI'daki anlık görüntü turuyla doğrulanır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./site-form.css", import.meta.url)), "utf8");

/** Yorum satırları mockup ölçülerini gerekçelendirir; kural metni değildir. */
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("site-form.css — token disiplini (plan TZ-6)", () => {
  it("bildirimlerde ciplak hex YOKTUR", () => {
    expect(declarations.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  it("renkler token uzerinden gelir", () => {
    expect(declarations).toMatch(/var\(--color-/);
  });

  it("santiye formuna ozgu bloklar bu dosyada, paylasilan .pf-* bloklari DEGIL", () => {
    // .pf-card / .pf-grid tek yerde (form-shell.css) tanımlıdır: çift tanım
    // kaskad kaydırır (plan T1 kabul kriteri).
    expect(declarations).not.toMatch(/^\.pf-card\s*{/m);
    expect(declarations).not.toMatch(/^\.pf-grid\s*{/m);
  });
});
