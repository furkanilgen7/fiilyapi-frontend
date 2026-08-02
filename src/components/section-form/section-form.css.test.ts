// @vitest-environment node
// site-form.css.test.ts deseni: stylesheet'in TOKEN disiplinini kapıya bağlar.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./section-form.css", import.meta.url)), "utf8");

const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("section-form.css — token disiplini", () => {
  it("bildirimlerde ciplak hex YOKTUR", () => {
    expect(declarations.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  it("renkler token uzerinden gelir", () => {
    expect(declarations).toMatch(/var\(--color-/);
  });

  it("bolum formuna ozgu bloklar bu dosyada, paylasilan .pf-* bloklari DEGIL", () => {
    expect(declarations).not.toMatch(/^\.pf-card\s*{/m);
    expect(declarations).not.toMatch(/^\.pf-grid\s*{/m);
  });
});
