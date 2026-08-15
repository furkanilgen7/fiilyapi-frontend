// @vitest-environment node
// `treasury.css.test.ts` ile AYNI gerekçe: dosya sistemi okuyan saf metin
// testi. Stylesheet METNİNDE ilgili kuralın var olduğunu doğrular; cascade'i
// ya da tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T3'ün işi). Amaç,
// FY/FK/FGI/FGE'ye bağlı ölçü/renk kararlarının sessizce silinmesine karşı
// regresyon korumasıdır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./invoices.css", import.meta.url)), "utf8");

describe("invoices.css — fatura mockup'larına bağlı kurallar", () => {
  it("KPI şeridi BEŞ sütunludur (FY:69)", () => {
    expect(css).toMatch(/\.fat-kpis\s*{[^}]*grid-template-columns:\s*repeat\(5,\s*1fr\)/);
  });

  it("kaynak kartları ÜÇ sütunludur (FK:58)", () => {
    expect(css).toMatch(/\.fat-source__cards\s*{[^}]*grid-template-columns:\s*repeat\(3,\s*1fr\)/);
  });

  it("detay künye şeridi DÖRT sütunludur (FGI:93)", () => {
    expect(css).toMatch(/\.fat-hero__meta\s*{[^}]*grid-template-columns:\s*repeat\(4,\s*1fr\)/);
  });

  it("taraf ızgarası ve alt bölge İKİ EŞİT sütundur (FGI:72, 192)", () => {
    expect(css).toMatch(/\.fat-hero__parties\s*{[^}]*grid-template-columns:\s*1fr 1fr/);
    expect(css).toMatch(/\.fat-columns\s*{[^}]*grid-template-columns:\s*1fr 1fr/);
  });

  it("para hücreleri ve fatura numarası JetBrains Mono'dur (FY:115-117 · FGI:62)", () => {
    expect(css).toMatch(/\.fat-table \.is-mono\s*{[^}]*var\(--font-mono\)/);
    expect(css).toMatch(/\.fat-hero__no\s*{[^}]*var\(--font-mono\)/);
    expect(css).toMatch(/\.fat-hero__amount\s*{[^}]*var\(--font-mono\)/);
  });

  it("🔴 'Onay Bekleyen' KPI'ı ADETtir: mono DEĞİL sans yazı ailesi kullanır (FY:74)", () => {
    expect(css).toMatch(/\.fat-kpi__value--count\s*{[^}]*var\(--font-sans\)/);
    // Modifier ortak kuralı EZMELİ (sonra tanımlanmalı).
    expect(css.indexOf(".fat-kpi__value--count")).toBeGreaterThan(
      css.indexOf(".fat-kpi__value {"),
    );
  });

  it("giden toplam satırı mavi, gelen toplam satırı kırmızı zeminlidir (FGI:183 · FGE:188)", () => {
    expect(css).toMatch(
      /\.fat-table tfoot \.fat-total-row td\s*{[^}]*background:\s*var\(--color-primary-soft\)/,
    );
    expect(css).toMatch(
      /\.fat-table tfoot \.fat-total-row--incoming td\s*{[^}]*background:\s*var\(--color-danger-soft\)/,
    );
  });

  it("eşleştirme kartı KEHRİBAR çerçevelidir (FGE:105)", () => {
    expect(css).toMatch(/\.fat-match\s*{[^}]*border:\s*2px solid var\(--color-warning\)/);
  });

  it("geniş tablolar KENDİ kabında yatay kayar — sayfa gövdesi taşmaz", () => {
    expect(css).toMatch(/\.fat-table-scroll\s*{[^}]*overflow-x:\s*auto/);
  });

  it("🔴 BEKÇİ: çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
