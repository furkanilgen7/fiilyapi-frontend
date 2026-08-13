// @vitest-environment node
// personnel-list.css.test.ts ile aynı gerekçe — dosya sistemi okuyan saf metin testi.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./hr-documents.css", import.meta.url)), "utf8");

describe("hr-documents.css — BT mockup'ına bağlı kurallar", () => {
  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  it("KPI kartlarının sol kenarlığı mockup rengindedir (60, 61, 62)", () => {
    expect(css).toMatch(/\.bt-kpi__card--valid\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.bt-kpi__card--expiring\s*{[^}]*var\(--color-warning\)/);
    expect(css).toMatch(/\.bt-kpi__card--expired\s*{[^}]*var\(--color-danger\)/);
  });

  it("kritik bant ve süresi dolan tablo koyu kırmızı başlık tonunu kullanır (51, 81)", () => {
    expect(css).toMatch(/\.bt-alert__title\s*{[^}]*var\(--color-danger-deep\)/);
    expect(css).toMatch(/\.bt-card__title\s*{[^}]*var\(--color-danger-deep\)/);
  });

  it("kehribar 'yaklaşan' kart başlığı mockup zemin/metin tonundadır (138)", () => {
    expect(css).toMatch(/\.bt-card__head--warning\s*{[^}]*var\(--color-amber-tint-cell\)/);
    expect(css).toMatch(/\.bt-card__title--warning\s*{[^}]*var\(--color-warning-deep-text\)/);
  });

  it("oran çubuğunun DÖRT dilimi de tanımlıdır (160, 170, 175)", () => {
    for (const key of ["valid", "expiring", "expired", "missing"]) {
      expect(css).toMatch(new RegExp(`\\.bt-bar__seg--${key}\\s*{`));
    }
  });

  it("devre-dışı süzgeç çipi tıklanabilir görünmez (67-76)", () => {
    expect(css).toMatch(/\.bt-chip\s*{[^}]*cursor:\s*not-allowed/);
  });
});
