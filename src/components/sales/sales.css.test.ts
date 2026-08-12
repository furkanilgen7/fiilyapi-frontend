// @vitest-environment node
// stock.css.test.ts ile aynı gerekçe — dosya sistemi okuyan saf metin testi.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./sales.css", import.meta.url)), "utf8");

describe("sales.css — SY mockup'ına bağlı kurallar", () => {
  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  it("KPI şeridi BEŞ eşit sütundur (54)", () => {
    expect(css).toMatch(/\.satis-kpi\s*{[^}]*grid-template-columns:\s*repeat\(5,\s*1fr\)/);
  });

  it("üç KPI kartının sol kenarlığı mockup rengindedir (55, 56, 59)", () => {
    expect(css).toMatch(/\.satis-kpi__card--sold\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.satis-kpi__card--reserved\s*{[^}]*var\(--color-warning\)/);
    expect(css).toMatch(/\.satis-kpi__card--overdue\s*{[^}]*var\(--color-danger\)/);
  });

  it("doluluk haritası hücreleri üç tonu mockup'tan alır (76, 89, 92)", () => {
    expect(css).toMatch(/\.satis-map__cell--sold\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.satis-map__cell--reserved\s*{[^}]*var\(--color-warning\)/);
    expect(css).toMatch(/\.satis-map__cell--available\s*{[^}]*var\(--color-border\)/);
  });

  it("blok ızgarası altı sütundur, bloklar iki sütuna yerleşir (72, 75)", () => {
    expect(css).toMatch(/\.satis-map__blocks\s*{[^}]*grid-template-columns:\s*1fr 1fr/);
    expect(css).toMatch(/\.satis-map__grid\s*{[^}]*grid-template-columns:\s*repeat\(6,\s*1fr\)/);
  });

  it("tablo başlıklarından ikisi renklidir: tahsil yeşil, kalan kehribar (153, 154)", () => {
    expect(css).toMatch(/\.satis-table__th--paid\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.satis-table__th--remaining\s*{[^}]*var\(--color-warning\)/);
  });

  it("gecikmiş ve rezerve satırların zemini boyanır (177, 186)", () => {
    expect(css).toMatch(/\.satis-row--overdue\s*{[^}]*background:/);
    expect(css).toMatch(/\.satis-row--reservation\s*{[^}]*background:/);
  });

  it("TOPLAM satırı mor şerittir (206)", () => {
    expect(css).toMatch(
      /\.satis-total\s*{[^}]*var\(--color-accent-purple-tint\)[^}]*border-top:\s*2px/,
    );
  });

  it("yaklaşan tahsilat satırları sol şerit taşır (221, 225)", () => {
    expect(css).toMatch(/\.satis-upcoming__row--overdue\s*{[^}]*border-left:\s*3px[^}]*/);
    expect(css).toMatch(/\.satis-upcoming__row--due\s*{[^}]*border-left:\s*3px[^}]*/);
  });
});
