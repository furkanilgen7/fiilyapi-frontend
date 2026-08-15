// @vitest-environment node
// Not: stock.css.test.ts ile aynı gerekçe — dosya sistemi okuyan saf metin
// testi. YALNIZCA stylesheet METNİNDE ilgili kuralın var olduğunu doğrular;
// cascade'i ya da tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T3'ün
// işi). Amaç, E9'a bağlı renk/ölçü kararlarının sessizce silinmesine karşı
// regresyon korumasıdır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./treasury.css", import.meta.url)), "utf8");

describe("treasury.css — E9 mockup'ına bağlı kurallar", () => {
  it("kart şeridi ÜÇ sütunlu ızgaradır (69)", () => {
    expect(css).toMatch(/\.hazine-cards\s*{[^}]*grid-template-columns:\s*repeat\(3,\s*1fr\)/);
  });

  it("panel ızgarası iki EŞİT sütundur (88)", () => {
    expect(css).toMatch(/\.hazine-panels\s*{[^}]*grid-template-columns:\s*1fr 1fr/);
  });

  it("kart bakiyesi ve satır tutarı JetBrains Mono'dur (72, 114)", () => {
    expect(css).toMatch(/\.hazine-card__balance\s*{[^}]*var\(--font-mono\)/);
    expect(css).toMatch(/\.hazine-row__amount\s*{[^}]*var\(--font-mono\)/);
  });

  it("ödeme satırının ÜÇ tonu da mockup renklerini taşır (112, 116, 120)", () => {
    for (const [tone, bg, border] of [
      ["danger", "--color-danger-row-bg", "--color-danger"],
      ["warning", "--color-orange-tint", "--color-warning"],
      ["success", "--color-success-tint", "--color-success-strong"],
    ]) {
      expect(css, `${tone} zemini`).toMatch(
        new RegExp(`\\.hazine-row--${tone}\\s*{[^}]*background:\\s*var\\(${bg}\\)`),
      );
      expect(css, `${tone} kenarlığı`).toMatch(
        new RegExp(`\\.hazine-row--${tone}\\s*{[^}]*border-left-color:\\s*var\\(${border}\\)`),
      );
    }
  });

  it("açıklama çizgileri giriş=yeşil · çıkış=kırmızı+kesiklidir (103, 104)", () => {
    expect(css).toMatch(/\.hazine-legend__line--in\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.hazine-legend__line--out\s*{[^}]*var\(--color-danger\)/);
    expect(css).toMatch(/\.hazine-legend__line--out\s*{[^}]*border-style:\s*dashed/);
  });

  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
