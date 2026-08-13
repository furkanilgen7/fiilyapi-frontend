// @vitest-environment node
// Not: `stock.css.test.ts` ile aynı gerekçe — dosya sistemi okuyan saf metin
// testi. YALNIZCA stylesheet METNİNDE ilgili kuralın var olduğunu doğrular;
// cascade'i ya da tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T5'in
// işi). Amaç, SAT/TED'e bağlı renk kararlarının sessizce silinmesine karşı
// regresyon korumasıdır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./purchasing.css", import.meta.url)), "utf8");

describe("purchasing.css — SAT/TED mockup'ına bağlı kurallar", () => {
  it("KPI değer renkleri karta özeldir (SAT 72 kehribar · 76 mavi · 80 nötr · 84 kırmızı)", () => {
    for (const [modifier, token] of [
      ["warning", "--color-warning"],
      ["primary", "--color-primary"],
      ["neutral", "--color-text"],
      ["danger", "--color-danger"],
    ]) {
      expect(css, modifier).toMatch(
        new RegExp(`\\.sat-kpi__value--${modifier}\\s*{[^}]*var\\(${token}\\)`),
      );
    }
  });

  it("aktif sekme mavi vurgu zeminini kullanır (SAT 90)", () => {
    expect(css).toMatch(/\.sat-tabs__tab--active\s*{[^}]*var\(--color-nav-active-bg\)/);
  });

  it("Onay Bekliyor / Teklif Bekleniyor rozet metni primitive'den KOYU tondadır (118, 127)", () => {
    expect(css).toMatch(/\.sat-badge--pending_approval\s*{[^}]*var\(--color-danger-strong\)/);
    expect(css).toMatch(/\.sat-badge--quote_wait\s*{[^}]*var\(--color-warning-strong\)/);
  });

  it("tedarikçi künye kutusunun DÖRT gradyan tonu da tanımlıdır (TED 43/64/84/105)", () => {
    for (const tone of [1, 2, 3, 4]) {
      expect(css, `tone ${tone}`).toMatch(
        new RegExp(`\\.ted-card__avatar--${tone}\\s*{[^}]*var\\(--gradient-supplier-avatar-${tone}\\)`),
      );
    }
  });

  it("ekleme kartı kesikli kenarlıklıdır (TED 125)", () => {
    expect(css).toMatch(/\.ted-add\s*{[^}]*2px dashed var\(--color-border-strong\)/);
  });

  it("teslimat tarihi ÜÇ tonu da tanımlıdır (SIP 65 kırmızı · 76 kehribar · 87 nötr)", () => {
    expect(css).toMatch(/\.sip-delivery--overdue\s*{[^}]*var\(--color-danger\)/);
    expect(css).toMatch(/\.sip-delivery--soon\s*{[^}]*var\(--color-warning\)/);
    expect(css).toMatch(/\.sip-delivery--neutral\s*{[^}]*var\(--color-text-muted\)/);
  });

  it("'Yolda' rozet metni primitive'den KOYU tondadır (SIP 66)", () => {
    expect(css).toMatch(/\.sip-badge--in_transit\s*{[^}]*var\(--color-warning-strong\)/);
  });

  it("'EN İYİ FİYAT' kartı kalın mavi kenarlıklıdır (TEK 56)", () => {
    expect(css).toMatch(/\.tek-card--best\s*{[^}]*2px solid var\(--color-primary\)/);
    expect(css).toMatch(/\.tek-card--best \.tek-card__head\s*{[^}]*var\(--color-primary\)/);
  });

  it("'EN HIZLI' rozeti SÖNÜKTÜR — veri kaynağı yok (TEK 100)", () => {
    expect(css).toMatch(/\.tek-card__badge--pending\s*{[^}]*var\(--color-text-subtle\)/);
  });

  it("nakliye iki hâli mockup renklerini taşır (TEK 70 yeşil · 90 kehribar)", () => {
    expect(css).toMatch(/\.tek-card__shipping--included\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.tek-card__shipping--excluded\s*{[^}]*var\(--color-warning\)/);
  });

  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
