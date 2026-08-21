// @vitest-environment node
// `bulk-unit-form.css.test.ts` ile aynı gerekçe: dosya sistemi okuyan saf METİN
// testi. Kuralın stylesheet'te VAR olduğunu doğrular; cascade'i/tarayıcı
// görünümünü DOĞRULAMAZ (görsel doğrulama görsel kapının işi). Amaç EI'ye
// bağlı renk/ölçü kararlarının sessizce silinmesine karşı regresyondur.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./unit-import.css", import.meta.url)), "utf8");

describe("unit-import.css — EI ölçüleri", () => {
  it("EI 45 içerik sütunu 1050px'tir (ortak 1000px'ten SAPAR)", () => {
    expect(css).toMatch(/\.ei-page\s*{[^}]*max-width:\s*1050px/);
  });

  it("EI 65 yüklenmiş dosya kutusu YEŞİL çerçeveli ve yeşil zeminlidir", () => {
    expect(css).toMatch(/\.ei-file\s*{[^}]*var\(--color-success-tint\)/);
    expect(css).toMatch(/\.ei-file\s*{[^}]*2px solid var\(--color-success-tint-border\)/);
  });

  it("EI 75 bırakma alanı KESİKLİ çerçevelidir", () => {
    expect(css).toMatch(/\.ei-drop\s*{[^}]*2px dashed var\(--color-dashed-border\)/);
  });

  it("EI 105 kartı kenardan kenaradır (padding 0 + overflow hidden)", () => {
    expect(css).toMatch(/\.ei-flush-card\s*{[^}]*padding:\s*0/);
    expect(css).toMatch(/\.ei-flush-card\s*{[^}]*overflow:\s*hidden/);
  });

  it("EI 115 satır tablosu KENDİ İÇİNDE kaydırılır (400px)", () => {
    expect(css).toMatch(/\.ei-rows__scroll\s*{[^}]*max-height:\s*400px/);
    expect(css).toMatch(/\.ei-rows__scroll\s*{[^}]*overflow-y:\s*auto/);
  });

  it("EI 117 tablo başlığı YAPIŞKANDIR (kaydırırken sütun adı kaybolmaz)", () => {
    expect(css).toMatch(/\.ei-rows-table thead th\s*{[^}]*position:\s*sticky/);
  });

  it("EI 96-98 üç sayaç ÜÇ AYRI tondadır (yeşil · amber · kırmızı)", () => {
    expect(css).toMatch(/\.ei-counter--valid\s*{[^}]*var\(--color-success-tint\)/);
    expect(css).toMatch(/\.ei-counter--warning\s*{[^}]*var\(--color-amber-tint-cell\)/);
    expect(css).toMatch(/\.ei-counter--error\s*{[^}]*var\(--color-audit-danger-row-bg\)/);
  });

  it("EI 100 özet şeridi SOL kenarından kırmızı çizgilidir", () => {
    expect(css).toMatch(/\.ei-strip--danger\s*{[^}]*border-left:\s*3px solid var\(--color-danger\)/);
  });

  it("EI 152 hatalı satır KIRMIZI, EI 164 uyarılı satır AMBER zeminlidir", () => {
    const errorRule =
      css.match(/tbody tr\.ei-rows-table__row--error\s*{[^}]*}/)?.[0] ?? "";
    const warningRule =
      css.match(/tbody tr\.ei-rows-table__row--warning\s*{[^}]*}/)?.[0] ?? "";
    expect(errorRule).toMatch(/var\(--color-audit-danger-row-bg\)/);
    expect(warningRule).toMatch(/var\(--color-amber-tint-cell\)/);
    expect(warningRule).not.toMatch(/danger/);
  });

  it("🔴 durum etiketi GÖRSEL olarak gizlidir ama `display:none` DEĞİLDİR", () => {
    const rule = css.match(/\.ei-status__label\s*{[^}]*}/)?.[0] ?? "";
    // `display:none` erişilebilir ağaçtan da düşürürdü — o zaman ikonun yanında
    // hiçbir metin kalmaz ve durum YALNIZ renkten okunurdu.
    expect(rule).not.toMatch(/display:\s*none/);
    expect(rule).toMatch(/clip-path:\s*inset\(50%\)/);
  });

  it("çıplak hex renk yoktur (token zorunluluğu)", () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
