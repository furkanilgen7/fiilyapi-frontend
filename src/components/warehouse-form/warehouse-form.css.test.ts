// @vitest-environment node
// KAPSAM UYARISI (document-form.css.test.ts ile aynı): bu dosya YALNIZCA
// stylesheet METNİNDE ilgili kuralın var olduğunu doğrular; cascade'i ya da
// tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T3'ün işi).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./warehouse-form.css", import.meta.url)), "utf8");

describe("warehouse-form.css — DP mockup'ına bağlı kurallar", () => {
  it("önizleme kutusu ikincil yüzey + kenarlıktır (99)", () => {
    expect(css).toMatch(/\.whf-preview\s*{[^}]*var\(--color-surface-2\)/s);
    expect(css).toMatch(/\.whf-preview\s*{[^}]*border:\s*1px solid/s);
  });

  it("MERKEZ rozeti mavi soft zeminlidir (107)", () => {
    expect(css).toMatch(/\.whf-preview__badge\s*{[^}]*var\(--color-primary-soft\)/s);
  });

  it("boş ad yer tutucusu SOLUK basılır (104)", () => {
    expect(css).toMatch(/\.whf-preview__name--empty\s*{[^}]*var\(--color-text-subtle\)/s);
  });

  it("mavi bilgi kutusu vurgu zeminlidir (111-112)", () => {
    expect(css).toMatch(/\.whf-info\s*{[^}]*var\(--color-nav-active-bg\)/s);
  });

  it("alt şeritte onay kutusu SOLA yaslanır (121)", () => {
    expect(css).toMatch(/\.whf__keep-flow\s*{[^}]*margin-right:\s*auto/s);
  });

  it("çıplak hex YOKTUR — tüm renkler token üzerinden gelir", () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
