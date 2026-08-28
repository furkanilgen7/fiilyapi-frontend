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
    expect(css).toMatch(
      /\.fs-side\s*{[^}]*border-radius:\s*var\(--radius-14\)/,
    );
    expect(css).toMatch(/\.fs-side\s*{[^}]*box-shadow:\s*var\(--shadow-card\)/);
    // Koyu genel toplam satırı 14px köşeden TAŞMAMALIDIR.
    expect(css).toMatch(/\.fs-side\s*{[^}]*overflow:\s*hidden/);
  });

  it("BL:45 · BL:67 — başlık şeridinin ALTINDA 2px'lik vurgu çizgisi vardır", () => {
    expect(css).toMatch(
      /\.fs-side__head\s*{[^}]*border-bottom:\s*2px solid transparent/,
    );
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
    expect(
      /\.fs-side--liabilities \.fs-side__head\s*{[^}]*var\(--color-nav-active-bg\)/.test(
        css,
      ),
    ).toBe(false);
  });

  it("BL:51 — kalem tutarı sağa yaslı MONO'dur", () => {
    expect(css).toMatch(/\.fs-side__line-value\s*{[^}]*text-align:\s*right/);
    expect(css).toMatch(
      /\.fs-side__line-value\s*{[^}]*font-family:\s*var\(--font-mono\)/,
    );
  });

  it("BL:60 — genel toplam satırının metni KOYU zemin üstünde beyazdır", () => {
    expect(css).toMatch(
      /\.fs-side__total-label\s*{[^}]*var\(--color-on-brand\)/,
    );
    expect(css).toMatch(
      /\.fs-side__total-value\s*{[^}]*var\(--color-on-brand\)/,
    );
    expect(css).toMatch(
      /\.fs-side__total-value\s*{[^}]*font-family:\s*var\(--font-mono\)/,
    );
  });

  it("BL:50 — bölüm bandı gri zeminli, KÜÇÜK/KALIN/BÜYÜK HARFtir", () => {
    expect(css).toMatch(
      /\.fs-side__band-cell\s*{[^}]*background:\s*var\(--color-surface-2\)/,
    );
    expect(css).toMatch(
      /\.fs-side__band-cell\s*{[^}]*text-transform:\s*uppercase/,
    );
    expect(css).toMatch(
      /\.fs-side__band-cell\s*{[^}]*font-weight:\s*var\(--weight-bold\)/,
    );
  });

  it("🔴 K3 — banner'ın İKİ tonu da vardır ve AYNI rengi almazlar", () => {
    expect(css).toMatch(/\.fs-banner--ok\s*{[^}]*var\(--color-success-tint\)/);
    expect(css).toMatch(/\.fs-banner--off\s*{[^}]*var\(--color-danger-soft\)/);
    expect(
      /\.fs-banner--off\s*{[^}]*var\(--color-success-tint\)/.test(css),
    ).toBe(false);
    expect(css).toMatch(
      /\.fs-banner--ok \.fs-banner__icon\s*{[^}]*var\(--color-success\)/,
    );
    expect(css).toMatch(
      /\.fs-banner--off \.fs-banner__icon\s*{[^}]*var\(--color-danger\)/,
    );
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
    expect(css).toMatch(
      /\.fs-cf-kpis\s*{[^}]*grid-template-columns:\s*repeat\(4, 1fr\)/,
    );
    expect(css).toMatch(/\.fs-cf-kpis\s*{[^}]*gap:\s*14px/);
  });

  it("NA:44 — KPI kartının SOL kenarı 4px'lik ton çizgisidir", () => {
    expect(css).toMatch(/\.fs-cf-kpi\s*{[^}]*border-left:\s*4px solid/);
    expect(css).toMatch(
      /\.fs-cf-kpi\s*{[^}]*border-radius:\s*var\(--radius-12\)/,
    );
  });

  it("🔴 ÜÇ TON AYRI paletten gelir — yeşil / kırmızı / kehribar", () => {
    expect(css).toMatch(/\.fs-cf-kpi--in\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.fs-cf-kpi--out\s*{[^}]*var\(--color-danger\)/);
    expect(css).toMatch(/\.fs-cf-kpi--finance\s*{[^}]*var\(--color-warning\)/);
    // Aynı renge düşerlerse şerit HİÇBİR bilgi taşımaz.
    expect(/\.fs-cf-kpi--out\s*{[^}]*var\(--color-success\)/.test(css)).toBe(
      false,
    );
  });

  it("NA:56 — NET kart zeminli ve etiketi KOYU yeşil/kalındır", () => {
    expect(css).toMatch(
      /\.fs-cf-kpi--highlight\s*{[^}]*var\(--color-success-tint\)/,
    );
    expect(css).toMatch(
      /\.fs-cf-kpi--highlight \.fs-cf-kpi__label\s*{[^}]*var\(--color-success-deep\)/,
    );
  });

  it("NA:62 — tablo esner, sağ sütun SABİT 380px", () => {
    expect(css).toMatch(
      /\.fs-cf-grid\s*{[^}]*grid-template-columns:\s*1fr 380px/,
    );
    expect(css).toMatch(/\.fs-cf-grid\s*{[^}]*gap:\s*var\(--space-5\)/);
  });

  it("🔴 NA:71-72 — İŞARET RENGİ: giriş yeşil, çıkış kırmızı ve AYNI olamaz", () => {
    expect(css).toMatch(/\.fs-cf-amount--in\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.fs-cf-amount--out\s*{[^}]*var\(--color-danger\)/);
    expect(/\.fs-cf-amount--out\s*{[^}]*var\(--color-success\)/.test(css)).toBe(
      false,
    );
  });

  it("NA:68/81/90 — üç bölüm bandı ÜÇ AYRI zemin taşır", () => {
    expect(css).toMatch(
      /\.fs-cf-band--in \.fs-cf-band__cell\s*{[^}]*var\(--color-success-tint\)/,
    );
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
    expect(css).toMatch(
      /\.fs-cf-closing--net \.fs-cf-closing__value\s*{[^}]*var\(--color-primary\)/,
    );
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
    expect(css).toMatch(
      /\.fs-cf-closing__value\s*{[^}]*font-family:\s*var\(--font-mono\)/,
    );
  });

  it("NA:119-139 — grafik 130px yüksekliğinde, çizgi ve nokta MARKA rengindedir", () => {
    expect(css).toMatch(/\.fs-cf-chart\s*{[^}]*height:\s*130px/);
    expect(css).toMatch(
      /\.fs-cf-chart__line\s*{[^}]*stroke:\s*var\(--color-primary\)/,
    );
    expect(css).toMatch(/\.fs-cf-chart__line\s*{[^}]*stroke-width:\s*2\.5/);
    expect(css).toMatch(
      /\.fs-cf-chart__dot\s*{[^}]*fill:\s*var\(--color-primary\)/,
    );
  });

  it("🔴 BEKÇİ (NA blokları dahil): çıplak hex renk YOKTUR", () => {
    // Aynı iddia iki kez yazılır: NA blokları BU dosyaya eklendi ve kural
    // onlar için de bağlayıcıdır.
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});

describe("financial-statements.css — E11'e bağlı kurallar (F-MT T4)", () => {
  it("E11:66 — segment denetimi TEK çerçevedir ve köşeleri kırpar", () => {
    expect(css).toMatch(/\.fs-mt-seg\s*{[^}]*display:\s*flex/);
    expect(css).toMatch(
      /\.fs-mt-seg\s*{[^}]*border-radius:\s*var\(--radius-8\)/,
    );
    // Aktif bölmenin zemini 8px köşeden TAŞMAMALIDIR.
    expect(css).toMatch(/\.fs-mt-seg\s*{[^}]*overflow:\s*hidden/);
  });

  it("🔴 segment denetimi BÜZÜLMEZ — yapraklarda sekmeler kırpılıyordu", () => {
    // ÖLÇÜLEN KUSUR (2026-08-27): `/bilanco` ve `/nakit-akisi`te sağ üstteki
    // denetim 276px doğal genişliğinden 148-152px'e büzülüyor, `Nakit Akışı`
    // sekmesi HİÇ görünmüyordu — yaprakların birbirine tek geçişi ölüydü.
    //
    // İKİ koşul BİRLİKTE gerekiyordu:
    //  (1) `.fs__actions` içindeki `Select` primitive'inin sarmalayıcısı
    //      `.select-wrap { width: 100% }` taşır (`ui/select/select.css`) ⇒
    //      esnek taban boyutu KAPSAYICININ TAMAMI olur ve satır her zaman
    //      aşırı-talep eder; kök ekranda `Select` YOKTUR, bu yüzden orada
    //      kusur da yoktur.
    //  (2) Yukarıdaki `overflow: hidden` bir esnek öğenin otomatik asgari
    //      boyutunu (`min-width: auto`) 0'a düşürür ⇒ denetim, min-content'i
    //      olan 276px'in ALTINA orantılı olarak büzülebilir.
    //
    // (2)'yi kaldırmak E11:66 gerekçesini (aktif bölmenin zemini köşeyi
    // taşmasın) bozardı; (1)'i kaldırmak paylaşılan primitive'i tüm uygulamada
    // değiştirirdi. Bu yüzden çare denetimi büzülmeden MUAF tutmaktır: açığı
    // `Select` emer (min-content'ine kadar daralır, metni kırpılmaz).
    expect(css).toMatch(/\.fs-mt-seg\s*{[^}]*flex-shrink:\s*0/);
  });

  it("🔴 E11:67 — BULUNULAN bölme pasif bölmelerle AYNI tonda olamaz", () => {
    expect(css).toMatch(
      /\.fs-mt-seg__item--current\s*{[^}]*background:\s*var\(--color-nav-active-bg\)/,
    );
    expect(css).toMatch(
      /\.fs-mt-seg__item--current\s*{[^}]*color:\s*var\(--color-primary\)/,
    );
    // Pasif bölme İKİNCİL metin rengindedir; ikisi eşitse denetim hangi
    // tabloya bakıldığını SÖYLEMEZ.
    expect(css).toMatch(
      /\.fs-mt-seg__item\s*{[^}]*color:\s*var\(--color-text-secondary\)/,
    );
    expect(
      /\.fs-mt-seg__item\s*{[^}]*color:\s*var\(--color-primary\)/.test(css),
    ).toBe(false);
  });

  it("🔴 E11:78/80 — dönem okunun DEVRE DIŞI hâli AYRI bir görünüm taşır", () => {
    // İşler görünüp hiçbir şey yapmayan bir denetim sessiz yalandır: `disabled`
    // durumu görsel olarak da ayrılır.
    expect(css).toMatch(
      /\.fs-mt-period__arrow:disabled\s*{[^}]*cursor:\s*not-allowed/,
    );
    expect(css).toMatch(
      /\.fs-mt-period__arrow:disabled\s*{[^}]*var\(--color-text-subtle\)/,
    );
  });

  it("🔴 E11:79 — dönem aralığı TEK SATIRDA durur (kutu mockup yüksekliğinde kalır)", () => {
    expect(css).toMatch(/\.fs-mt-period__label\s*{[^}]*white-space:\s*nowrap/);
  });

  it("E11:85 — kartlar İKİ EŞİT sütunlu ızgaradır (20px boşluk)", () => {
    expect(css).toMatch(
      /\.fs-mt-grid\s*{[^}]*grid-template-columns:\s*1fr 1fr/,
    );
    expect(css).toMatch(/\.fs-mt-grid\s*{[^}]*gap:\s*var\(--space-5\)/);
  });

  it("E11:150 — sağ sütun 14px aralıkla dikey yığındır", () => {
    expect(css).toMatch(/\.fs-mt-aside\s*{[^}]*flex-direction:\s*column/);
    expect(css).toMatch(/\.fs-mt-aside\s*{[^}]*gap:\s*14px/);
  });

  it("E11:87-88 — kart 14px köşeli/gölgeli, başlık şeridi gri zeminlidir", () => {
    expect(css).toMatch(
      /\.fs-mt-card\s*{[^}]*border-radius:\s*var\(--radius-14\)/,
    );
    expect(css).toMatch(
      /\.fs-mt-card\s*{[^}]*box-shadow:\s*var\(--shadow-card\)/,
    );
    expect(css).toMatch(
      /\.fs-mt-card__head\s*{[^}]*background:\s*var\(--color-surface-2\)/,
    );
  });

  it("🔴 K8 — devre dışı kart SİLİNMEZ, ayrı bir zeminle basılır", () => {
    expect(css).toMatch(
      /\.fs-mt-card--disabled\s*{[^}]*background:\s*var\(--color-surface-2\)/,
    );
  });

  it("E11:98-100 — üç sütun: etiket GİRİNTİLİ, tutar MONO/sağa yaslı, oran sağa yaslı", () => {
    expect(css).toMatch(
      /\.fs-is-line__label\s*{[^}]*padding:\s*10px var\(--space-5\) 10px 28px/,
    );
    expect(css).toMatch(/\.fs-is-line__value\s*{[^}]*text-align:\s*right/);
    expect(css).toMatch(
      /\.fs-is-line__value\s*{[^}]*font-family:\s*var\(--font-mono\)/,
    );
    expect(css).toMatch(/\.fs-is-ratio\s*{[^}]*text-align:\s*right/);
  });

  it("🔴 İKİ ARA TOPLAM AYNI ZEMİNİ PAYLAŞMAZ (E11:105 mavi · E11:131 turuncu)", () => {
    expect(css).toMatch(
      /\.fs-is-subtotal--revenue\s*{[^}]*var\(--color-info-tint\)/,
    );
    expect(css).toMatch(
      /\.fs-is-subtotal--expense\s*{[^}]*var\(--color-orange-tint\)/,
    );
    // Eşitlerlerse tablo geliri giderden AYIRT ETTİRMEZ.
    expect(
      /\.fs-is-subtotal--expense\s*{[^}]*var\(--color-info-tint\)/.test(css),
    ).toBe(false);
    // E11:133 — `Toplam Gider` tutarı kırmızıdır.
    expect(css).toMatch(
      /\.fs-is-subtotal--expense \.fs-is-subtotal__value\s*{[^}]*var\(--color-danger\)/,
    );
  });

  it("E11:139-142 — DÖNEM KARI yeşil zeminli, tutarı 18px MONO, marjı kalın yeşildir", () => {
    expect(css).toMatch(
      /\.fs-is-profit\s*{[^}]*background:\s*var\(--color-success-tint\)/,
    );
    expect(css).toMatch(
      /\.fs-is-profit__value\s*{[^}]*font-size:\s*var\(--text-lg\)/,
    );
    expect(css).toMatch(
      /\.fs-is-profit__value\s*{[^}]*font-family:\s*var\(--font-mono\)/,
    );
    expect(css).toMatch(/\.fs-is-ratio--strong\s*{[^}]*var\(--color-success\)/);
  });

  it("🔴 BEKÇİ (E11 blokları dahil): çıplak hex renk YOKTUR", () => {
    // Aynı iddia üçüncü kez yazılır: E11 blokları BU dosyaya eklendi ve kural
    // onlar için de bağlayıcıdır.
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
