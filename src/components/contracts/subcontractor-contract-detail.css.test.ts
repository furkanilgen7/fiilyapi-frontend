// @vitest-environment node
// Not: tokens.test.ts ile aynı gerekçe — dosya sistemi okuyan saf metin testi.
//
// KAPSAM UYARISI (employer-contract-detail.css.test.ts ile aynı): bu dosya
// YALNIZCA stylesheet METNİNDE ilgili kuralın var olduğunu doğrular; cascade'i
// ya da tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T8'in işi).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./subcontractor-contract-detail.css", import.meta.url)),
  "utf8",
);

describe("subcontractor-contract-detail.css — TSD mockup'ına bağlı kurallar", () => {
  it("bağlantı zinciri bandı açık mavi zemin + mavi kenarlık taşır (47)", () => {
    expect(css).toMatch(
      /\.tsd-chain\s*{[^}]*var\(--color-info-tint\)[^}]*var\(--color-primary-ring\)/s,
    );
  });

  it("dört zincir rozetinin dört AYRI tonu tanımlıdır (49/55/60/65)", () => {
    expect(css).toMatch(/\.tsd-chain__chip--employer\s*{[^}]*var\(--color-text\)/s);
    expect(css).toMatch(/\.tsd-chain__chip--project\s*{[^}]*var\(--color-primary\)/s);
    expect(css).toMatch(/\.tsd-chain__chip--site\s*{[^}]*var\(--color-accent-teal-start\)/s);
    expect(css).toMatch(/\.tsd-chain__chip--current\s*{[^}]*var\(--color-warning\)/s);
  });

  it("Toplam Sözleşme Bedeli kehribar, Ödenen Hakediş yeşildir (73-74)", () => {
    expect(css).toMatch(/\.tsd-metrics__value--contract\s*{[^}]*var\(--color-warning\)/s);
    expect(css).toMatch(/\.tsd-metrics__value--paid\s*{[^}]*var\(--color-success\)/s);
  });

  it("B.F. girdisi sarı çerçeve/zemin taşır (mockup `.bf-input`, 12/115)", () => {
    expect(css).toMatch(
      /\.tsd-items__price-input\s*{[^}]*var\(--color-warning-border-soft\)[^}]*var\(--color-amber-tint-cell\)/s,
    );
  });

  it("tfoot KEHRİBARdır — E14'ün mavi tonu DEĞİL (175)", () => {
    expect(css).toMatch(/\.tsd-items__foot-row\s*{[^}]*var\(--color-amber-tint-cell\)/s);
    expect(css).toMatch(
      /\.tsd-items__foot-row\s*{[^}]*var\(--border-width-total\) solid var\(--color-warning\)/s,
    );
  });

  it("Hakediş % çubuğunun iki tonu da tanımlıdır (118 mavi · 142 kehribar)", () => {
    expect(css).toMatch(/\.tsd-progress__fill--normal\s*{[^}]*var\(--color-primary\)/s);
    expect(css).toMatch(/\.tsd-progress__fill--low\s*{[^}]*var\(--color-warning\)/s);
  });

  it("kehribar bilgi bandı kendi gövde metin tonunu kullanır (83)", () => {
    expect(css).toMatch(/\.tsd-banner__text\s*{[^}]*var\(--color-warning-body-text\)/s);
  });

  it("poz tablosunun KABUĞU burada YENİDEN TÜRETİLMEZ (.ecd-items paylaşılır)", () => {
    expect(css).not.toMatch(/^\.ecd-items/m);
    expect(css).not.toMatch(/\.tsd-items__table\s*{/);
    expect(css).not.toMatch(/\.tsd-items__th\s*{/);
  });

  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
