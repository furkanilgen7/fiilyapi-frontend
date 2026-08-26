// @vitest-environment node
// section-form.css.test.ts deseninin birebiri: stylesheet'in TOKEN disiplinini
// kapıya bağlar. Çıplak hex, tasarım sisteminden KAÇAN renk demektir.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./boq-assignment.css", import.meta.url)), "utf8");
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("boq-assignment.css — token disiplini", () => {
  it("bildirimlerde çıplak hex YOKTUR", () => {
    expect(declarations.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  it("renkler token üzerinden gelir", () => {
    expect(declarations).toMatch(/var\(--color-/);
  });

  // Bu dosya kartın EK durumlarını taşır; temel bloklar section-form.css'te
  // kalır ve KOPYALANMAZ (iki yerde tanımlı sınıf, özgüllük eşitken demet
  // sırasına göre kazanır — sessiz görsel kayma kaynağı).
  it("temel .sf-boq-card / .sf-boq-table bloklarını YENİDEN TANIMLAMAZ", () => {
    expect(declarations).not.toMatch(/^\.sf-boq-card\s*\{/m);
    expect(declarations).not.toMatch(/^\.sf-boq-table\s*\{/m);
  });
});
