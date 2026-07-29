// @vitest-environment node
// Not: tokens.test.ts ile aynı gerekçe — dosya sistemi okuyan saf metin testi.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./project-detail.css", import.meta.url)), "utf8");

// Erişilebilirlik incelemesi (Task 12, madde 3): sekme barı ve kart çipleri
// (ProjectDetailTabs, SiteCard) gerçek <a> etiketleri — klavyeyle erişilebilirler,
// ama düzeltmeden önce tasarlanmış bir :focus-visible durumu yoktu.
describe("project-detail.css — odak durumları", () => {
  it("proje sekmesi marka zemininde belirgin bir on-brand dış hat tanımlar", () => {
    // Jenerik --focus-ring (mavi, düşük opaklık) marka degradesi üstünde
    // görünmez kalır — bu yüzden burada --color-on-brand tabanlı outline gerekir.
    expect(css).toMatch(/\.project-hero__tab:focus-visible\s*{[^}]*outline:\s*2px solid var\(--color-on-brand\)/);
  });

  it("şantiye kartı çipi :focus-visible ile tasarlanmış odak halkası tanımlar (--focus-ring)", () => {
    expect(css).toMatch(/\.site-card__chip:focus-visible\s*{[^}]*--focus-ring/);
  });
});
