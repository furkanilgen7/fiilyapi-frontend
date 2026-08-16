// @vitest-environment node
// `accounting.css.test.ts` ile AYNI gerekçe: dosya sistemi okuyan saf metin
// testi. Kuralın METİNDE var olduğunu doğrular; cascade'i ya da tarayıcıdaki
// görünümü DOĞRULAMAZ. Amaç BL'ye bağlı ölçü/renk kararlarının sessizce
// silinmesine karşı regresyon korumasıdır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./financial-statements.css", import.meta.url)),
  "utf8",
);

describe("financial-statements.css — BL'ye bağlı kurallar", () => {
  it("BL:42 — taraflar İKİ EŞİT sütunlu ızgaradır", () => {
    expect(css).toMatch(/\.fs-sides\s*{[^}]*grid-template-columns:\s*1fr 1fr/);
    expect(css).toMatch(/\.fs-sides\s*{[^}]*gap:\s*var\(--space-5\)/);
  });

  it("BL:44 — taraf kartı 14px köşe + kart gölgesi + `overflow: hidden`", () => {
    expect(css).toMatch(/\.fs-side\s*{[^}]*border-radius:\s*var\(--radius-14\)/);
    expect(css).toMatch(/\.fs-side\s*{[^}]*box-shadow:\s*var\(--shadow-card\)/);
    // Koyu genel toplam satırı 14px köşeden TAŞMAMALIDIR.
    expect(css).toMatch(/\.fs-side\s*{[^}]*overflow:\s*hidden/);
  });

  it("BL:45 · BL:67 — başlık şeridinin ALTINDA 2px'lik vurgu çizgisi vardır", () => {
    expect(css).toMatch(/\.fs-side__head\s*{[^}]*border-bottom:\s*2px solid transparent/);
    expect(css).toMatch(
      /\.fs-side--assets \.fs-side__head\s*{[^}]*border-bottom-color:\s*var\(--color-primary\)/,
    );
    expect(css).toMatch(
      /\.fs-side--liabilities \.fs-side__head\s*{[^}]*border-bottom-color:\s*var\(--color-success\)/,
    );
  });

  it("🔴 İKİ TON AYNI paleti PAYLAŞMAZ — AKTİF mavi, PASİF yeşil", () => {
    expect(css).toMatch(
      /\.fs-side--assets \.fs-side__total-label,\s*\.fs-side--assets \.fs-side__total-value\s*{[^}]*var\(--color-primary\)/,
    );
    expect(css).toMatch(
      /\.fs-side--liabilities \.fs-side__total-label,\s*\.fs-side--liabilities \.fs-side__total-value\s*{[^}]*var\(--color-success\)/,
    );
    // Aynı zemine düşerlerse iki kart birbirinden AYIRT EDİLEMEZ.
    expect(/\.fs-side--liabilities \.fs-side__head\s*{[^}]*var\(--color-nav-active-bg\)/.test(css)).toBe(
      false,
    );
  });

  it("BL:51 — kalem tutarı sağa yaslı MONO'dur", () => {
    expect(css).toMatch(/\.fs-side__line-value\s*{[^}]*text-align:\s*right/);
    expect(css).toMatch(/\.fs-side__line-value\s*{[^}]*font-family:\s*var\(--font-mono\)/);
  });

  it("BL:60 — genel toplam satırının metni KOYU zemin üstünde beyazdır", () => {
    expect(css).toMatch(/\.fs-side__total-label\s*{[^}]*var\(--color-on-brand\)/);
    expect(css).toMatch(/\.fs-side__total-value\s*{[^}]*var\(--color-on-brand\)/);
    expect(css).toMatch(/\.fs-side__total-value\s*{[^}]*font-family:\s*var\(--font-mono\)/);
  });

  it("BL:50 — bölüm bandı gri zeminli, KÜÇÜK/KALIN/BÜYÜK HARFtir", () => {
    expect(css).toMatch(/\.fs-side__band-cell\s*{[^}]*background:\s*var\(--color-surface-2\)/);
    expect(css).toMatch(/\.fs-side__band-cell\s*{[^}]*text-transform:\s*uppercase/);
    expect(css).toMatch(/\.fs-side__band-cell\s*{[^}]*font-weight:\s*var\(--weight-bold\)/);
  });

  it("🔴 K3 — banner'ın İKİ tonu da vardır ve AYNI rengi almazlar", () => {
    expect(css).toMatch(/\.fs-banner--ok\s*{[^}]*var\(--color-success-tint\)/);
    expect(css).toMatch(/\.fs-banner--off\s*{[^}]*var\(--color-danger-soft\)/);
    expect(/\.fs-banner--off\s*{[^}]*var\(--color-success-tint\)/.test(css)).toBe(false);
    expect(css).toMatch(/\.fs-banner--ok \.fs-banner__icon\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.fs-banner--off \.fs-banner__icon\s*{[^}]*var\(--color-danger\)/);
  });

  it("🔴 K4 — KONTRA hesaplar için AYRI bir renk/biçim kuralı YOKTUR", () => {
    // Netleme SUNUCUDA olur (BL:57 tek ve pozitif bir satırdır); istemcide
    // parantez/kırmızı/eksi icat eden bir sınıf doğarsa bu iddia kırılır.
    expect(css).not.toMatch(/contra/i);
    expect(css).not.toMatch(/\.fs-side__line-value--negative/);
  });

  it("🔴 BEKÇİ: çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});

describe("financial-statements.css — NA'ya bağlı kurallar (F-MT T3)", () => {
  it("NA:43 — KPI şeridi DÖRT eşit sütundur, 14px boşlukla", () => {
    expect(css).toMatch(/\.fs-cf-kpis\s*{[^}]*grid-template-columns:\s*repeat\(4, 1fr\)/);
    expect(css).toMatch(/\.fs-cf-kpis\s*{[^}]*gap:\s*14px/);
  });

  it("NA:44 — KPI kartının SOL kenarı 4px'lik ton çizgisidir", () => {
    expect(css).toMatch(/\.fs-cf-kpi\s*{[^}]*border-left:\s*4px solid/);
    expect(css).toMatch(/\.fs-cf-kpi\s*{[^}]*border-radius:\s*var\(--radius-12\)/);
  });

  it("🔴 ÜÇ TON AYRI paletten gelir — yeşil / kırmızı / kehribar", () => {
    expect(css).toMatch(/\.fs-cf-kpi--in\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.fs-cf-kpi--out\s*{[^}]*var\(--color-danger\)/);
    expect(css).toMatch(/\.fs-cf-kpi--finance\s*{[^}]*var\(--color-warning\)/);
    // Aynı renge düşerlerse şerit HİÇBİR bilgi taşımaz.
    expect(/\.fs-cf-kpi--out\s*{[^}]*var\(--color-success\)/.test(css)).toBe(false);
  });

  it("NA:56 — NET kart zeminli ve etiketi KOYU yeşil/kalındır", () => {
    expect(css).toMatch(/\.fs-cf-kpi--highlight\s*{[^}]*var\(--color-success-tint\)/);
    expect(css).toMatch(
      /\.fs-cf-kpi--highlight \.fs-cf-kpi__label\s*{[^}]*var\(--color-success-deep\)/,
    );
  });

  it("NA:62 — tablo esner, sağ sütun SABİT 380px", () => {
    expect(css).toMatch(/\.fs-cf-grid\s*{[^}]*grid-template-columns:\s*1fr 380px/);
    expect(css).toMatch(/\.fs-cf-grid\s*{[^}]*gap:\s*var\(--space-5\)/);
  });

  it("🔴 NA:71-72 — İŞARET RENGİ: giriş yeşil, çıkış kırmızı ve AYNI olamaz", () => {
    expect(css).toMatch(/\.fs-cf-amount--in\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.fs-cf-amount--out\s*{[^}]*var\(--color-danger\)/);
    expect(/\.fs-cf-amount--out\s*{[^}]*var\(--color-success\)/.test(css)).toBe(false);
  });

  it("NA:68/81/90 — üç bölüm bandı ÜÇ AYRI zemin taşır", () => {
    expect(css).toMatch(/\.fs-cf-band--in \.fs-cf-band__cell\s*{[^}]*var\(--color-success-tint\)/);
    expect(css).toMatch(
      /\.fs-cf-band--out \.fs-cf-band__cell\s*{[^}]*var\(--color-audit-danger-row-bg\)/,
    );
    expect(css).toMatch(
      /\.fs-cf-band--finance \.fs-cf-band__cell\s*{[^}]*var\(--color-amber-tint-cell\)/,
    );
  });

  it("NA:99 — DÖNEM BAŞI satırının ÜSTÜNDE 2px ayırıcı vardır", () => {
    expect(css).toMatch(
      /\.fs-cf-closing--opening \.fs-cf-closing__label,\s*\.fs-cf-closing--opening \.fs-cf-closing__value\s*{[^}]*border-top:\s*2px solid var\(--color-border-strong\)/,
    );
  });

  it("NA:103 — NET DEĞİŞİM satırı MAVİ zeminlidir (kapanıştan AYRI ton)", () => {
    expect(css).toMatch(
      /\.fs-cf-closing--net \.fs-cf-closing__label,\s*\.fs-cf-closing--net \.fs-cf-closing__value\s*{[^}]*var\(--color-nav-active-bg\)/,
    );
    expect(css).toMatch(/\.fs-cf-closing--net \.fs-cf-closing__value\s*{[^}]*var\(--color-primary\)/);
  });

  it("NA:107 — DÖNEM SONU satırı KOYU zemin üstünde beyazdır ve 18px basar", () => {
    expect(css).toMatch(
      /\.fs-cf-closing--total \.fs-cf-closing__label,\s*\.fs-cf-closing--total \.fs-cf-closing__value\s*{[^}]*var\(--color-primary\)/,
    );
    expect(css).toMatch(
      /\.fs-cf-closing--total \.fs-cf-closing__label,\s*\.fs-cf-closing--total \.fs-cf-closing__value\s*{[^}]*var\(--color-on-brand\)/,
    );
    expect(css).toMatch(
      /\.fs-cf-closing--total \.fs-cf-closing__value\s*{[^}]*font-size:\s*var\(--text-lg\)/,
    );
  });

  it("NA:101 — kapanış tutarları sağa yaslı MONO'dur", () => {
    expect(css).toMatch(/\.fs-cf-closing__value\s*{[^}]*text-align:\s*right/);
    expect(css).toMatch(/\.fs-cf-closing__value\s*{[^}]*font-family:\s*var\(--font-mono\)/);
  });

  it("NA:119-139 — grafik 130px yüksekliğinde, çizgi ve nokta MARKA rengindedir", () => {
    expect(css).toMatch(/\.fs-cf-chart\s*{[^}]*height:\s*130px/);
    expect(css).toMatch(/\.fs-cf-chart__line\s*{[^}]*stroke:\s*var\(--color-primary\)/);
    expect(css).toMatch(/\.fs-cf-chart__line\s*{[^}]*stroke-width:\s*2\.5/);
    expect(css).toMatch(/\.fs-cf-chart__dot\s*{[^}]*fill:\s*var\(--color-primary\)/);
  });

  it("🔴 BEKÇİ (NA blokları dahil): çıplak hex renk YOKTUR", () => {
    // Aynı iddia iki kez yazılır: NA blokları BU dosyaya eklendi ve kural
    // onlar için de bağlayıcıdır.
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
