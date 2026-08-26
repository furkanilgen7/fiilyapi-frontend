// @vitest-environment node
// `accounting.css.test.ts` ile AYNI gerekçe: dosya sistemi okuyan saf metin
// testi. Stylesheet METNİNDE ilgili kuralın var olduğunu doğrular; cascade'i
// ya da tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama e2e'nin işi).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./accounting-pro.css", import.meta.url)), "utf8");

describe("accounting-pro.css — MP'ye bağlı kurallar", () => {
  it("KPI ızgarası BEŞ eşit sütundur (MP:114)", () => {
    expect(css).toMatch(/\.mu-pro-kpis\s*{[^}]*grid-template-columns:\s*repeat\(5, 1fr\)/);
  });

  it("gövde `1fr 340px` iki sütundur (MP:140)", () => {
    expect(css).toMatch(/\.mu-pro-grid\s*{[^}]*grid-template-columns:\s*1fr 340px/);
  });

  it("KPI değeri kalın MONO'dur (MP:117)", () => {
    expect(css).toMatch(/\.mu-pro-kpi__value\s*{[^}]*var\(--font-mono\)/);
    expect(css).toMatch(/\.mu-pro-kpi__value\s*{[^}]*var\(--weight-bold\)/);
  });

  it("KDV kartı TURUNCU, alacak YEŞİL, borç KIRMIZI (MP:117/121/129)", () => {
    expect(css).toMatch(/\.mu-pro-kpi__value--warning\s*{[^}]*var\(--color-warning\)/);
    expect(css).toMatch(/\.mu-pro-kpi__value--success\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.mu-pro-kpi__value--danger\s*{[^}]*var\(--color-danger\)/);
  });

  it("🔴 sağ ray listesi KIRPILMAZ, KAYDIRILIR", () => {
    // `max-height` + `overflow-y: auto` birlikte olmalı: yalnız `max-height`
    // satırları görünmez kılar (kırpma), yalnız `overflow` sınır koymaz.
    expect(css).toMatch(/\.mu-pro-rail__list\s*{[^}]*max-height:/);
    expect(css).toMatch(/\.mu-pro-rail__list\s*{[^}]*overflow-y:\s*auto/);
  });

  it("🔴 GERÇEK SIFIR satırı SOLUK ama BASILI bir kuralı vardır", () => {
    // K-MKD3: "değer 0" ayrı bir hâldir ve `display: none` ALMAZ.
    expect(css).toMatch(/\.mu-pro-rail__amount--flat\s*{[^}]*var\(--color-text-subtle\)/);
    expect(css).not.toMatch(/\.mu-pro-rail__amount--flat\s*{[^}]*display:\s*none/);
  });

  it("çıplak hex renk YOKTUR (palet YALNIZ token'dan)", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
