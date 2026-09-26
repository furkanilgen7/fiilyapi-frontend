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

/**
 * F-SUBPX-3 (lider denetimi) · `.tsd-progress__fill` geri düşüş deseni —
 * `contracts.css`teki `.szl-progress__fill` bekçisiyle BİREBİR aynı gerekçe
 * (orada belgeli): `@supports` STATİK sorgusu, art arda iki çıplak `width`
 * bildirimi DEĞİL (o desen `var()` yüzünden IACVT ile `width`i `auto`ya
 * sıfırlar, çubuk kaybolur).
 */
describe("subcontractor-contract-detail.css — .tsd-progress__fill geri düşüş (F-SUBPX-3)", () => {
  it("`@supports` DIŞINDA yalnız TEK `width` bildirimi vardır (düz özel özellik)", () => {
    const fillRule = css.match(/\.tsd-progress__fill\s*{([^}]*)}/);
    expect(fillRule, "üst düzey .tsd-progress__fill kuralı bulunamadı").not.toBeNull();
    const body = fillRule![1];
    const widthDecls = body.match(/width\s*:/g) ?? [];
    expect(widthDecls, "üst düzey kuralda TEK width bildirimi olmalı").toHaveLength(1);
    expect(body).toMatch(/width:\s*var\(--contract-progress-width\)\s*;/);
    expect(body).not.toMatch(/round\(/);
  });

  it("`round()` geri düşüşü `@supports (width: round(...))` bloğunun İÇİNDEDİR", () => {
    expect(css).toMatch(
      /@supports\s*\(width:\s*round\(down,\s*1%,\s*1px\)\)\s*{\s*\.tsd-progress__fill\s*{[^}]*width:\s*round\(down,\s*var\(--contract-progress-width\),\s*1px\)/s,
    );
  });

  it("`@supports` bloğu ana kuraldan SONRA gelir (üzerine yazma sırası doğru)", () => {
    const baseIndex = css.indexOf(".tsd-progress__fill {");
    const supportsIndex = css.indexOf("@supports (width: round(down, 1%, 1px))");
    expect(baseIndex).toBeGreaterThan(-1);
    expect(supportsIndex).toBeGreaterThan(baseIndex);
  });
});
