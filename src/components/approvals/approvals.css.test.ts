// @vitest-environment node
// `financial-instruments.css.test.ts` ile AYNI gerekçe: dosya sistemi okuyan
// saf metin testi. YALNIZCA stylesheet METNİNDE ilgili kuralın var olduğunu
// doğrular; cascade'i ya da tarayıcıdaki görünümü DOĞRULAMAZ (o görsel kapının
// işi). Amaç, `Onay Kutusu.dc.html`e bağlı renk/ölçü kararlarının sessizce
// silinmesine karşı regresyon korumasıdır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./approvals.css", import.meta.url)), "utf8");

describe("approvals.css — mockup'a bağlı kurallar", () => {
  it("kart 14px yarıçap + kart gölgesidir (:17)", () => {
    expect(css).toMatch(/\.ok-card\s*{[^}]*border-radius:\s*var\(--radius-14\)/);
    expect(css).toMatch(/\.ok-card\s*{[^}]*box-shadow:\s*var\(--shadow-card\)/);
  });

  it("rol akışı kutusu açık mavi zeminlidir (:42)", () => {
    expect(css).toMatch(/\.ok-flow\s*{[^}]*background:\s*var\(--color-info-tint\)/);
    expect(css).toMatch(/\.ok-flow\s*{[^}]*border-radius:\s*var\(--radius-12\)/);
  });

  it("patron kartı mavi zemin + beyaz metindir (:60-62)", () => {
    expect(css).toMatch(/\.ok-flow__role--patron\s*{[^}]*background:\s*var\(--color-primary\)/);
    expect(css).toMatch(
      /\.ok-flow__role--patron \.ok-flow__role-desc\s*{[^}]*var\(--color-on-brand-70\)/,
    );
  });

  it("etkin sekme mavi metin + mavi zemindir ve ortak kuralı EZER (:72)", () => {
    expect(css).toMatch(
      /\.ok-tab\[aria-current="page"\]\s*{[^}]*color:\s*var\(--color-primary\)/,
    );
    expect(css).toMatch(
      /\.ok-tab\[aria-current="page"\]\s*{[^}]*background:\s*var\(--color-nav-active-bg\)/,
    );
    // Bekçi: modifier ortak kuraldan SONRA tanımlanmalı, yoksa ezemez.
    expect(css.indexOf('.ok-tab[aria-current="page"]')).toBeGreaterThan(css.indexOf(".ok-tab {"));
  });

  it("🔴 DÖRT adım durumunun DÖRT AYRI tonu vardır (:130 :133 :170 :135)", () => {
    for (const [state, token] of [
      ["decided", "--color-success-soft"],
      ["current-other", "--color-primary-soft"],
      ["current-mine", "--color-primary"],
      ["upcoming", "--color-neutral-soft"],
    ]) {
      expect(css, state).toMatch(
        new RegExp(`\\.ok-step--${state}\\s*{[^}]*background:\\s*var\\(${token}\\)`),
      );
    }
  });

  it("🔴 `●`/`○` GLİF DEĞİL CSS dairesidir; boş hâli yalnız kenarlıktır", () => {
    expect(css).toMatch(/\.ok-step__dot\s*{[^}]*border-radius:\s*999px/);
    expect(css).toMatch(/\.ok-step__dot\s*{[^}]*background:\s*currentColor/);
    expect(css).toMatch(/\.ok-step__dot--hollow\s*{[^}]*background:\s*transparent/);
    expect(css).toMatch(/\.ok-step__dot--hollow\s*{[^}]*border:\s*1px solid currentColor/);
  });

  it("adımlar arası ayırıcı 20x1px'tir (:131)", () => {
    expect(css).toMatch(/\.ok-step-divider\s*{[^}]*width:\s*20px/);
    expect(css).toMatch(/\.ok-step-divider\s*{[^}]*height:\s*1px/);
  });

  it("tutar değeri 700 ağırlıkta mono'dur (:138)", () => {
    expect(css).toMatch(/\.ok-amount__value\s*{[^}]*font-weight:\s*var\(--weight-bold\)/);
    expect(css).toMatch(/\.ok-amount__value\s*{[^}]*font-family:\s*var\(--font-mono\)/);
  });

  it("İŞVEREN HAKEDİŞ rozeti mor tint'tir — `ui/badge`e YENİ VARYANT eklenmedi (:216)", () => {
    expect(css).toMatch(/\.ok-badge--isveren\s*{[^}]*background:\s*var\(--color-purple-tint\)/);
    expect(css).toMatch(/\.ok-badge--isveren\s*{[^}]*color:\s*var\(--color-accent-purple\)/);
  });

  it("🔴 işveren 'Onayla' düğmesi MOR'dur ve `.btn--primary`den DAHA ÖZGÜLDÜR (:233)", () => {
    expect(css).toMatch(
      /\.ok-card \.btn\.ok-btn--approve-purple\s*{[^}]*background:\s*var\(--color-accent-purple-grad-start\)/,
    );
  });

  it("'Reddet' outline-danger, 'Detay' nötr zeminlidir (:144 :145)", () => {
    expect(css).toMatch(/\.ok-card \.btn\.ok-btn--reject\s*{[^}]*color:\s*var\(--color-danger-strong\)/);
    expect(css).toMatch(
      /\.ok-card \.btn\.ok-btn--reject\s*{[^}]*border-color:\s*var\(--color-danger-border-soft\)/,
    );
    expect(css).toMatch(/\.ok-card \.btn\.ok-btn--detail\s*{[^}]*background:\s*var\(--color-neutral-soft\)/);
  });

  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    // Yorumlardaki mockup referansları ölçüm kaydıdır, KURAL değildir.
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
