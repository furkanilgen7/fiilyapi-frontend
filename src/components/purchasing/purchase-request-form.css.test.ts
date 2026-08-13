// @vitest-environment node
// Not: `purchasing.css.test.ts` ile aynı gerekçe — dosya sistemi okuyan saf
// metin testi. YALNIZCA stylesheet METNİNDE ilgili kuralın var olduğunu
// doğrular; cascade'i ya da tarayıcıdaki görünümü DOĞRULAMAZ (görsel
// doğrulama T5'in işi). Amaç FST'ye bağlı renk kararlarının sessizce
// silinmesine karşı regresyon korumasıdır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./purchase-request-form.css", import.meta.url)),
  "utf8",
);

describe("purchase-request-form.css — FST mockup'ına bağlı kurallar", () => {
  it("kritik stoklu satırın zemini kırmızımsıdır (82)", () => {
    expect(css).toMatch(
      /\.saf-table__row--critical\s*{[^}]*var\(--color-audit-danger-row-bg\)/,
    );
  });

  it("Mevcut Stok tonları sunucunun durum damgasından türer (85 kırmızı · 94 kehribar)", () => {
    expect(css).toMatch(/\.saf-stock--critical\s*{[^}]*var\(--color-danger-strong\)/);
    expect(css).toMatch(/\.saf-stock--low\s*{[^}]*var\(--color-warning-strong\)/);
  });

  it("Talep Miktarı hücresi mavi vurguludur (86)", () => {
    expect(css).toMatch(/\.saf-table__input--accent\s*{[^}]*var\(--color-nav-active-bg\)/);
  });

  it("onay akışı kutusu mavi zemin + mavi kenarlıktır (156)", () => {
    expect(css).toMatch(/\.saf-approval\s*{[^}]*var\(--color-nav-active-bg\)/);
    expect(css).toMatch(/\.saf-approval\s*{[^}]*var\(--color-primary-ring\)/);
  });

  it("onay zincirinin üç durumu da ayrı renktedir (159 yeşil · 161 mavi · 163 nötr)", () => {
    expect(css).toMatch(/\.saf-step\s*{[^}]*var\(--color-neutral-soft\)/);
    expect(css).toMatch(/\.saf-step--done\s*{[^}]*var\(--color-success-soft\)/);
    expect(css).toMatch(/\.saf-step--next\s*{[^}]*var\(--color-primary-soft\)/);
  });

  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    // Yorumlar taranmaz: mockup'ın hex değerini `/* #dc2626 (85) */` diye
    // KAYDETMEK izlenebilirliktir (stock-entry-form.css deseni); yasak olan
    // hex'in KURALDA kullanılmasıdır.
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
