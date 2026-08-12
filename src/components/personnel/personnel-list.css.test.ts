// @vitest-environment node
// stock.css.test.ts ile aynı gerekçe — dosya sistemi okuyan saf metin testi.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./personnel-list.css", import.meta.url)), "utf8");

describe("personnel-list.css — P mockup'ına bağlı kurallar", () => {
  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  it("Şirket/Taşeron KPI kartlarının sol kenarlığı mockup rengindedir (94, 98)", () => {
    expect(css).toMatch(/\.personel-kpi__card--company\s*{[^}]*var\(--color-primary\)/);
    expect(css).toMatch(/\.personel-kpi__card--subcontractor\s*{[^}]*var\(--color-warning\)/);
  });

  it("aktif sekme mavi vurgu zeminini kullanır (71)", () => {
    expect(css).toMatch(/\.personel-tabs__tab--active\s*{[^}]*var\(--color-nav-active-bg\)/);
  });
});
