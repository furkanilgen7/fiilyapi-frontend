// @vitest-environment node
// Not: tokens.test.ts ile aynı gerekçe — dosya sistemi okuyan saf metin testi.
//
// KAPSAM UYARISI (contracts.css.test.ts ile aynı): bu dosya YALNIZCA
// stylesheet METNİNDE ilgili kuralın var olduğunu doğrular; cascade'i ya da
// tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T8'in işi).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./employer-contract-detail.css", import.meta.url)),
  "utf8",
);

describe("employer-contract-detail.css — E14 mockup'ına bağlı kurallar", () => {
  it("Bitiş Tarihi metriği KIRMIZIDIR (84)", () => {
    expect(css).toMatch(/\.ecd-metrics__value--danger\s*{[^}]*var\(--color-danger\)/);
  });

  it("Sözleşme Bedeli metriği mono + 15px/700'dür (81)", () => {
    expect(css).toMatch(
      /\.ecd-metrics__value--money\s*{[^}]*var\(--text-contract-metric\)[^}]*var\(--font-mono\)/s,
    );
  });

  it("seçili sekme mavi metin + açık mavi zemin taşır (91)", () => {
    expect(css).toMatch(
      /\.ecd-tabs__tab--active\s*{[^}]*var\(--color-primary\)[^}]*var\(--color-nav-active-bg\)/s,
    );
  });

  it("Hakediş Özeti çubuğu mockup gradyanını kullanır (131)", () => {
    expect(css).toMatch(
      /\.ecd-pps__bar-fill\s*{[^}]*var\(--gradient-progress-financial\)/s,
    );
  });

  it("kesinti satırları kırmızı, Net Ödeme yeşil zeminli + yeşil metindir (137/141/143-145)", () => {
    expect(css).toMatch(/\.ecd-pps__box-value\s*{[^}]*var\(--color-danger\)/s);
    expect(css).toMatch(/\.ecd-pps__box--net\s*{[^}]*var\(--color-success-soft\)/s);
    expect(css).toMatch(
      /\.ecd-pps__box--net \.ecd-pps__box-value\s*{[^}]*var\(--color-success\)/s,
    );
  });

  it("başlık kartı 16px köşe taşır (65)", () => {
    expect(css).toMatch(/\.ecd-head\s*{[^}]*var\(--radius-16\)/s);
  });

  it("'Kalan' rozetinin iki tonu da POZ mockup'ından gelir (100 yeşil / 161 KIRMIZI)", () => {
    expect(css).toMatch(/\.ecd-items__remaining--zero\s*{[^}]*var\(--color-success-soft\)/s);
    // Final review (F-P5 T8): açık kalan KIRMIZI — kehribar DEĞİL. Bu tablonun
    // kolonları POZ mockup'ından türetildiği için tonu da oradan gelir; POZ
    // ızgarasıyla (`.cdist-grid__remaining--open`) tek tondadır.
    expect(css).toMatch(/\.ecd-items__remaining--open\s*{[^}]*var\(--color-danger-soft\)/s);
    expect(css).not.toMatch(/\.ecd-items__remaining--open\s*{[^}]*var\(--color-warning-soft\)/s);
  });

  it("kalem tablosu kendi kaydırma kabındadır (F-TH dersi: sessiz veri kırpması yok)", () => {
    expect(css).toMatch(/\.ecd-items__scroll\s*{[^}]*overflow-x:\s*auto/s);
  });

  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
