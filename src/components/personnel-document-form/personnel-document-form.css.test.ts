// @vitest-environment node
// KAPSAM UYARISI (document-form.css.test.ts ile aynı): bu dosya YALNIZCA
// stylesheet METNİNDE ilgili kuralın var olduğunu doğrular; cascade'i ya da
// tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T3'ün işi).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./personnel-document-form.css", import.meta.url)),
  "utf8",
);

describe("personnel-document-form.css — PB mockup'ına bağlı kurallar", () => {
  it("diyalog kabuğu mockup gövde genişliğine açılır (73: 820px)", () => {
    expect(css).toMatch(/\.pdf-modal\s*{[^}]*max-width:\s*820px/s);
  });

  it("alan ızgarası iki kolonludur (123)", () => {
    expect(css).toMatch(/\.pdf-grid\s*{[^}]*grid-template-columns:\s*1fr 1fr/s);
  });

  it("dar ekranda ikinci kolon gizlenmez, alta düşer", () => {
    expect(css).toMatch(/@media \(max-width: 640px\)\s*{[^@]*grid-template-columns:\s*1fr;/s);
  });

  it("dosya kutusu kesikli çerçevelidir (97 `.drop`)", () => {
    expect(css).toMatch(/\.pdf-drop\s*{[^}]*border:\s*2px dashed/s);
  });

  it('"veya" ayracının iki yanında çizgi vardır (103-107)', () => {
    expect(css).toMatch(/\.pdf-or::before,\s*\.pdf-or::after\s*{[^}]*height:\s*1px/s);
  });

  it("İSG uyarı kutusu amber zemin + amber kenarlıktır (156)", () => {
    expect(css).toMatch(/\.pdf-ohs\s*{[^}]*var\(--color-amber-tint-cell\)/s);
    expect(css).toMatch(/\.pdf-ohs\s*{[^}]*var\(--color-warning-border-soft\)/s);
  });

  it("çıplak hex YOKTUR — tüm renkler token üzerinden gelir", () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
