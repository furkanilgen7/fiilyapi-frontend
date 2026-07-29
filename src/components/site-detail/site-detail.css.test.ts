// @vitest-environment node
// Not: tokens.test.ts ile aynı gerekçe — dosya sistemi okuyan saf metin testi.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./site-detail.css", import.meta.url)), "utf8");

// Erişilebilirlik incelemesi (Task 12, madde 3): sekme barı, hero eylemleri ve
// bölüm kartı eylemleri (SiteDetailTabs, SiteHeroBar, SectionCard) gerçek
// <a>/<button> etiketleri — klavyeyle erişilebilirler, ama düzeltmeden önce
// tasarlanmış bir :focus-visible durumu yoktu.
describe("site-detail.css — odak durumları", () => {
  it("şantiye sekmesi :focus-visible ile tasarlanmış odak halkası tanımlar (--focus-ring)", () => {
    expect(css).toMatch(/\.site-detail-tabs__tab:focus-visible\s*{[^}]*--focus-ring/);
  });

  it("hero eylem butonu marka zemininde belirgin bir on-brand dış hat tanımlar", () => {
    // project-hero__tab ile aynı gerekçe: jenerik --focus-ring marka degradesi
    // üstünde görünmez kalır.
    expect(css).toMatch(/\.site-hero__btn:focus-visible\s*{[^}]*outline:\s*2px solid var\(--color-on-brand\)/);
  });

  it("bölüm kartı eylem butonu :focus-visible ile tasarlanmış odak halkası tanımlar (--focus-ring)", () => {
    expect(css).toMatch(/\.section-card__action-btn:focus-visible\s*{[^}]*--focus-ring/);
  });
});
