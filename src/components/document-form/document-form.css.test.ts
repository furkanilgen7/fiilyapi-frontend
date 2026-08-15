// @vitest-environment node
// KAPSAM UYARISI (contract-item-form.css.test.ts ile aynı): bu dosya YALNIZCA
// stylesheet METNİNDE ilgili kuralın var olduğunu doğrular; cascade'i ya da
// tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T3'ün işi).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./document-form.css", import.meta.url)), "utf8");

describe("document-form.css — belge formu mockup'larına bağlı kurallar", () => {
  it("diyalog kabuğu mockup gövde genişliğine açılır (EKP 69 · ARŞ 66: 820px)", () => {
    expect(css).toMatch(/\.dcf-modal\s*{[^}]*max-width:\s*820px/s);
  });

  it("alan ızgarası iki kolonludur (EKP 98 · ARŞ 85)", () => {
    expect(css).toMatch(/\.dcf-grid\s*{[^}]*grid-template-columns:\s*1fr 1fr/s);
  });

  it("dar ekranda ikinci kolon gizlenmez, alta düşer", () => {
    expect(css).toMatch(/@media \(max-width: 640px\)\s*{[^@]*grid-template-columns:\s*1fr;/s);
  });

  it("dosya kutusu kesikli çerçevelidir (EKP 87 · ARŞ 74 `.drop`)", () => {
    expect(css).toMatch(/\.dcf-drop\s*{[^}]*border:\s*2px dashed/s);
  });

  it("rozet önizlemesinin üç tonu ayrı sınıflardır (EKP 131 · 135 · 139)", () => {
    expect(css).toMatch(/\.dcf-legend__badge--ok\s*{[^}]*var\(--color-success-soft\)/s);
    expect(css).toMatch(/\.dcf-legend__badge--warn\s*{[^}]*var\(--color-warning-soft\)/s);
    expect(css).toMatch(/\.dcf-legend__badge--danger\s*{[^}]*var\(--color-danger-soft\)/s);
  });

  it("çıplak hex YOKTUR — tüm renkler token üzerinden gelir", () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
