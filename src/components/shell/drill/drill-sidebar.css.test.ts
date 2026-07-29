// @vitest-environment node
// Not: tokens.test.ts ile aynı gerekçe — dosya sistemi okuyan saf metin testi,
// jsdom'un URL polyfill'i file:// çözümünü bozduğu için node ortamında çalışır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./drill-sidebar.css", import.meta.url)), "utf8");

// Erişilebilirlik incelemesi (Task 12, madde 3): DrillSidebar'daki geri linki
// ve nav öğeleri klavyeyle odaklanabilir gerçek <a> etiketleridir, ama düzeltmeden
// önce tasarlanmış bir :focus-visible durumu yoktu — tarayıcı varsayılanı
// bastırılmasa da token tabanlı, kasıtlı bir odak halkası eksikti.
describe("drill-sidebar.css — odak durumları", () => {
  it("geri linki :focus-visible ile tasarlanmış odak halkası tanımlar (--focus-ring)", () => {
    expect(css).toMatch(/\.drill-sidebar__back:focus-visible\s*{[^}]*--focus-ring/);
  });

  it("nav öğesi :focus-visible ile tasarlanmış odak halkası tanımlar (--focus-ring)", () => {
    expect(css).toMatch(/\.drill-nav-item:focus-visible\s*{[^}]*--focus-ring/);
  });
});
