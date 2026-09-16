// @vitest-environment node
// personnel-detail.css.test.ts deseni: stylesheet'in TOKEN disiplinini kapıya bağlar.
// kalan-6 no 18 — CLAUDE.md:8 "çıplak hex yasak" der; bu dosya 47 kardeş
// *.css.test.ts bekçisinin AYNI deseninden EKSİKTİ.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./ai-panel.css", import.meta.url)), "utf8");

const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("ai-panel.css — token disiplini", () => {
  it("bildirimlerde ciplak hex YOKTUR", () => {
    expect(declarations.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  it("renkler token uzerinden gelir", () => {
    expect(declarations).toMatch(/var\(--color-/);
  });
});
