// @vitest-environment node
// Not: subcontractors.css.test.ts ile aynı gerekçe — dosya sistemi okuyan saf
// metin testi. YALNIZCA stylesheet METNİNDE ilgili kuralın var olduğunu
// doğrular; cascade'i ya da tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama
// T5'in işi). Amaç, E3'e bağlı renk kararlarının sessizce silinmesine karşı
// regresyon korumasıdır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./stock.css", import.meta.url)), "utf8");

describe("stock.css — E3 mockup'ına bağlı kurallar", () => {
  it("kritik/düşük satır zemini turuncu tonudur (121, 139, 166)", () => {
    expect(css).toMatch(/\.stok-row--flagged\s*{[^}]*var\(--color-orange-tint\)/);
  });

  it("bakiye tonları karta özeldir (125 kırmızı · 143 kehribar · 134 nötr)", () => {
    for (const [modifier, token] of [
      ["neutral", "--color-text"],
      ["danger", "--color-danger"],
      ["warning", "--color-warning"],
    ]) {
      expect(css, modifier).toMatch(
        new RegExp(`\\.stok-balance--${modifier}\\s*{[^}]*var\\(${token}\\)`),
      );
    }
  });

  it("Kritik/Düşük rozet metni primitive'den KOYU tondadır (128, 146)", () => {
    expect(css).toMatch(/\.stok-badge--critical\s*{[^}]*var\(--color-danger-strong\)/);
    expect(css).toMatch(/\.stok-badge--low\s*{[^}]*var\(--color-warning-strong\)/);
  });

  it("KPI değer renkleri karta özeldir (75 nötr · 79 kırmızı · 83 kehribar)", () => {
    expect(css).toMatch(/\.stok-kpi__value--neutral\s*{[^}]*var\(--color-text\)/);
    expect(css).toMatch(/\.stok-kpi__value--danger\s*{[^}]*var\(--color-danger\)/);
    expect(css).toMatch(/\.stok-kpi__value--warning\s*{[^}]*var\(--color-warning\)/);
  });

  it("aktif segment düğmesi mavi vurgu zeminini kullanır (94)", () => {
    expect(css).toMatch(
      /\.stok-segment__item--active\s*{[^}]*var\(--color-nav-active-bg\)/,
    );
  });

  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
