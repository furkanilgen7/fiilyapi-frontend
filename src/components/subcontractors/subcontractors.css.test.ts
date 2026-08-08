// @vitest-environment node
// Not: contracts.css.test.ts ile aynı gerekçe — dosya sistemi okuyan saf metin
// testi. YALNIZCA stylesheet METNİNDE ilgili kuralın var olduğunu doğrular;
// cascade'i ya da tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T8'in
// işi). Amaç, mockup'a bağlı renk kararlarının sessizce silinmesine karşı
// regresyon korumasıdır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./subcontractors.css", import.meta.url)), "utf8");

describe("subcontractors.css — TL mockup'ına bağlı kurallar", () => {
  it("KPI değer renkleri karta özeldir (35-38: nötr · yeşil · KIRMIZI · kehribar)", () => {
    for (const [modifier, token] of [
      ["neutral", "--color-text"],
      ["success", "--color-success"],
      ["danger", "--color-danger"],
      ["warning", "--color-warning"],
    ]) {
      expect(css, modifier).toMatch(
        new RegExp(`\\.tl-kpi__value--${modifier}\\s*{[^}]*var\\(${token}\\)`),
      );
    }
  });

  it("kategori rozetinin mor tonu token çiftinden gelir (77, 97)", () => {
    expect(css).toMatch(
      /\.tl-badge--purple\s*{[^}]*var\(--color-accent-purple-soft\)[^}]*var\(--color-accent-purple\)/,
    );
  });

  it("'Doğrama' rozeti success-soft'tan bir ton AÇIK zemin kullanır (87)", () => {
    expect(css).toMatch(/\.tl-badge--success\s*{[^}]*var\(--color-success-tint\)/);
  });

  it("kehribar rozet metni primitive'den KOYU tondadır (67, 61)", () => {
    expect(css).toMatch(/\.tl-badge--warning\s*{[^}]*var\(--color-warning-strong\)/);
    expect(css).toMatch(/\.tl-badge--pending-due\s*{[^}]*var\(--color-warning-strong\)/);
  });

  it("satır yalnız hedefi olduğunda tıklanabilir görünür (55)", () => {
    expect(css).toMatch(/\.tl-row--clickable\s*{[^}]*cursor:\s*pointer/);
  });

  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
