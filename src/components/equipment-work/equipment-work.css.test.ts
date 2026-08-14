// @vitest-environment node
// Saf metin testi (personnel-list.css.test.ts emsali): dosya sistemi okur.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./equipment-work.css", import.meta.url)), "utf8");

describe("equipment-work.css — M3 mockup'ına bağlı kurallar", () => {
  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  it("gövde mockup'ın iki sütununu korur: esnek tablo + 360px sağ panel (108)", () => {
    expect(css).toMatch(/\.makine-cal__grid\s*{[^}]*grid-template-columns:\s*1fr 360px/);
  });

  it("KPI şeridi BEŞ karttır (79)", () => {
    expect(css).toMatch(/\.makine-cal-kpi\s*{[^}]*repeat\(5, 1fr\)/);
  });

  it("arızalı/bakım satırlarının zemini mockup tonlarıdır (150, 176)", () => {
    expect(css).toMatch(
      /\.makine-cal-table__row--danger\s*{[^}]*var\(--color-audit-danger-row-bg\)/,
    );
    expect(css).toMatch(/\.makine-cal-table__row--warning\s*{[^}]*var\(--color-amber-tint-cell\)/);
  });
});
