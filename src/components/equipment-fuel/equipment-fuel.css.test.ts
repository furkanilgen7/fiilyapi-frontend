// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./equipment-fuel.css", import.meta.url)), "utf8");
const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("equipment-fuel.css — KAYIT 93: panel başlığında seçici taşmaz", () => {
  it(".makine-yakit-panel__head .select-wrap sabit bir flex-basis alir (width:100% ezilir)", () => {
    const rule = rules.match(/\.makine-yakit-panel__head \.select-wrap\s*{[^}]*}/)?.[0] ?? "";
    expect(rule).toMatch(/flex:\s*0\s+1\s+\d+px/);
  });
});
