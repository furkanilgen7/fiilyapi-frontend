// @vitest-environment node
// Not: `treasury.css.test.ts` ile aynı gerekçe — dosya sistemi okuyan saf metin
// testi. YALNIZCA stylesheet METNİNDE ilgili kuralın var olduğunu doğrular;
// cascade'i ya da tarayıcıdaki görünümü DOĞRULAMAZ (o görsel kapının işi).
// Amaç, E10'a bağlı renk/ölçü kararlarının sessizce silinmesine karşı
// regresyon korumasıdır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./financial-instruments.css", import.meta.url)),
  "utf8",
);

describe("financial-instruments.css — E10 mockup'ına bağlı kurallar", () => {
  it("kart şeridi DÖRT sütunlu ızgaradır (E10:69)", () => {
    expect(css).toMatch(/\.fin-cards\s*{[^}]*grid-template-columns:\s*repeat\(4,\s*1fr\)/);
  });

  it("kart değeri 22px/700 JetBrains Mono'dur (E10:72)", () => {
    expect(css).toMatch(/\.fin-card__value\s*{[^}]*var\(--text-numeric\)/);
    expect(css).toMatch(/\.fin-card__value\s*{[^}]*var\(--weight-bold\)/);
    expect(css).toMatch(/\.fin-card__value\s*{[^}]*var\(--font-mono\)/);
  });

  it("dört kartın DÖRT AYRI rengi vardır (E10:72, 77, 82, 87)", () => {
    for (const [tone, token] of [
      ["success", "--color-success"],
      ["danger", "--color-danger"],
      ["warning", "--color-warning"],
      ["muted", "--color-text-muted"],
    ]) {
      expect(css, tone).toMatch(
        new RegExp(`\\.fin-card__value--${tone}\\s*{[^}]*color:\\s*var\\(${token}\\)`),
      );
    }
  });

  it("etkin sekme mavi metin + mavi zemindir (E10:94)", () => {
    expect(css).toMatch(
      /\.fin-tab\[aria-current="page"\]\s*{[^}]*color:\s*var\(--color-primary\)/,
    );
    expect(css).toMatch(
      /\.fin-tab\[aria-current="page"\]\s*{[^}]*background:\s*var\(--color-nav-active-bg\)/,
    );
    // Bekçi: modifier ortak kuralı gerçekten EZMELİ (sonra tanımlanmalı).
    expect(css.indexOf('.fin-tab[aria-current="page"]')).toBeGreaterThan(css.indexOf(".fin-tab {"));
  });

  it("tablo kabı 14px yarıçap + kart gölgesidir (E10:99)", () => {
    expect(css).toMatch(/\.fin-table-wrap\s*{[^}]*border-radius:\s*var\(--radius-14\)/);
    expect(css).toMatch(/\.fin-table-wrap\s*{[^}]*box-shadow:\s*var\(--shadow-card\)/);
  });

  it("tablo başlığı 11px/600 uppercase + 0.8px izlemedir (E10:104)", () => {
    expect(css).toMatch(/\.fin-table th\s*{[^}]*font-size:\s*var\(--text-table-head\)/);
    expect(css).toMatch(/\.fin-table th\s*{[^}]*text-transform:\s*uppercase/);
    expect(css).toMatch(/\.fin-table th\s*{[^}]*letter-spacing:\s*var\(--tracking-wide\)/);
  });

  it("tutar sütunu 700 ağırlıkta mono'dur (E10:119)", () => {
    expect(css).toMatch(/\.fin-table__amount\s*{[^}]*font-weight:\s*var\(--weight-bold\)/);
    expect(css).toMatch(/\.fin-table \.is-mono\s*{[^}]*var\(--font-mono\)/);
  });

  it("vade hücresinin ÜÇ tonu ayrışır: turuncu · yeşil · nötr (E10:118, 127, 154)", () => {
    expect(css).toMatch(/\.fin-table__due--due\s*{\s*color:\s*var\(--color-warning\)/);
    expect(css).toMatch(/\.fin-table__due--portfolio\s*{\s*color:\s*var\(--color-success\)/);
    expect(css).toMatch(/\.fin-table__due--settled[^{]*{[^}]*var\(--color-text-muted\)/);
  });

  it("🔴 `Vadede` rozetinin METNİ koyu turuncudur ve sarmalanmaz (E10:121)", () => {
    // `Badge` warning varyantı metni --color-warning basar; mockup #d97706
    // (--color-warning-strong) ister → tek özellik EZİLİR.
    expect(css).toMatch(/\.fin-badge--due\s*{[^}]*color:\s*var\(--color-warning-strong\)/);
    expect(css).toMatch(/\.fin-badge--due\s*{[^}]*white-space:\s*nowrap/);
  });

  it("son satırın alt çizgisi YOKTUR (E10:153 `<tr>` kenarlıksız)", () => {
    expect(css).toMatch(/\.fin-table tbody tr:last-child\s*{[^}]*border-bottom:\s*none/);
  });

  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
