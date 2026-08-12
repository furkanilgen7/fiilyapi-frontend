// @vitest-environment node
// section-form.css.test.ts deseni: stylesheet'in TOKEN disiplinini kapıya bağlar.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./personnel-detail.css", import.meta.url)), "utf8");

const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("personnel-detail.css — token disiplini", () => {
  it("bildirimlerde ciplak hex YOKTUR", () => {
    expect(declarations.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  it("renkler token uzerinden gelir", () => {
    expect(declarations).toMatch(/var\(--color-/);
  });
});
