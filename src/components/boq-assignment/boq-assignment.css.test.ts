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

  /**
   * M5_3 #35 — mockup (`Form - Poz Secici.dc.html:136`) aşım satırını
   * `#fff7f7` zeminle + `#fecaca` alt kenarlıkla çizer. `--color-danger-tint`
   * (#fff0f0) mockup'ın rengi DEĞİLDİR; doğru ton `--color-danger-tint-weak`
   * (#fff7f7) + `--color-danger-tint-border` (#fecaca) token çiftidir.
   */
  it.each([".sf-boq-table__row--over", ".sf-boq-ptable__row--over"])(
    "%s satırı mockup'ın #fff7f7 zemini + #fecaca kenarlığını taşır",
    (selector) => {
      const escaped = selector.replace(/\./g, "\\.");
      const rule = new RegExp(`${escaped} td\\s*{([^}]*)}`).exec(declarations)?.[1] ?? "";
      expect(rule).toContain("var(--color-danger-tint-weak)");
      expect(rule).toContain("var(--color-danger-tint-border)");
      // Eski (mockup'a aykırı) ton geri sızmasın.
      expect(rule).not.toMatch(/background:\s*var\(--color-danger-tint\)/);
    },
  );
});
