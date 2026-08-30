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
  /**
   * 84 · Bitiş Tarihi'nin rengi ARTIK TÜREVDİR (F-SZLEKR, onaylı sapma):
   * geçmiş = kırmızı, 0..30 gün = kehribar, ötesi nötr. İKİ değiştirici de
   * stylesheet'te YAŞAMALIDIR — `contractEndTone` "warning" döndürüp CSS'i
   * olmasaydı ekranda GÖRÜNMEYEN bir ton adı kalırdı (sessiz kusur).
   */
  it("Bitiş Tarihi metriğinin GEÇMİŞ tonu KIRMIZIDIR (84)", () => {
    expect(css).toMatch(/\.ecd-metrics__value--danger\s*{[^}]*var\(--color-danger\)/);
  });

  it("Bitiş Tarihi metriğinin YAKLAŞAN tonu KEHRİBARDIR — ürün çapında tek token", () => {
    // `.sip-delivery--soon` ile AYNI token: "yaklaşıyor" anlamının tek rengi.
    expect(css).toMatch(/\.ecd-metrics__value--warning\s*{[^}]*var\(--color-warning\)/);
    // Kehribar bir yumuşak ZEMİN değil METİN rengidir (metrik şeridi düz).
    expect(css).not.toMatch(/\.ecd-metrics__value--warning\s*{[^}]*var\(--color-warning-soft\)/);
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

  /**
   * 🔴 NÜKS BEKÇİSİ (F-ISVPOZ'da ÖLÇÜLEREK bulundu).
   *
   * `.ecd-items__td--price` / `--qty` E14 kalem tablosunda ARTIK
   * KULLANILMIYOR (hücreler satır-içi `Input` oldu) ama ÜÇ BAŞKA bileşen
   * hâlâ kullanıyor: `ContractDistributionGrid`,
   * `SubcontractorContractItemsTable`, `SubcontractorContractPaymentsCard`.
   * F-ISVPOZ turunda "ölü kural" sanılıp silindiler ve ÜÇ KARE birden oynadı
   * (`poz-dagilimi` · `poz-ekle-taseron` · `taseron-sozlesme-detay`).
   * Ders: CSS sınıfının kapsamı DOSYA değil DEMETtir — bir kuralın ölü
   * olduğu, onu tanımlayan dosyanın bileşenine bakarak KANITLANAMAZ.
   */
  it("PAYLAŞILAN hücre kuralları silinmez (üç başka bileşen kullanıyor)", () => {
    expect(css).toMatch(/\.ecd-items__td--price\s*{[^}]*var\(--font-mono\)/s);
    expect(css).toMatch(/\.ecd-items__td--qty\s*{[^}]*var\(--font-mono\)/s);
  });

  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  /**
   * F-MILESTONE · 103/107/111/115/119 · nokta rengi YALNIZ durumdan türer.
   * Üç durumun ÜÇÜ de stylesheet'te YAŞAMALIDIR: `milestoneState`/
   * `TimelineSection.status` bir sınıf adı üretip CSS'i olmasaydı ekranda
   * GÖRÜNMEYEN bir durum adı kalırdı (`--warning` tonuyla aynı sessiz kusur).
   */
  it("milestone noktası: tamamlanan YEŞİL, süren MAVİ + açık mavi halka, planlanan GRİ", () => {
    expect(css).toMatch(/\.ecd-ms__dot--completed\s*{[^}]*var\(--color-success\)/s);
    expect(css).toMatch(
      /\.ecd-ms__dot--active\s*{[^}]*var\(--color-primary\)[^}]*var\(--color-primary-border-soft\)/s,
    );
    expect(css).toMatch(/\.ecd-ms__dot--planned\s*{[^}]*var\(--color-border\)/s);
  });

  /**
   * 🔴 `SectionStatus` DÖRT üyelidir; `palette.ts`in ONAYLI SAPMASI ile aynı
   * gerekçe: dördüncüsünü "Planlandı" gibi boyamak durumu SESSİZCE yutardı.
   */
  it("dördüncü durum (`on_hold`) KENDİ rengini taşır — planlanana ÇÖKMEZ", () => {
    expect(css).toMatch(/\.ecd-ms__dot--on_hold\s*{[^}]*var\(--color-warning\)/s);
  });

  /**
   * ONAYLI SAPMA (F-MILESTONE): mockup DÜZ liste çizer çünkü orada bölüm ile
   * milestone ayrimi YOKTUR. Gerçek veride İKİ SEVİYE var; girinti kalkarsa
   * milestone'un hangi bölüme ait olduğu okunamaz hâle gelir.
   */
  it("milestone satırları bölümün ALTINA girintilenir (iki seviye okunur kalır)", () => {
    expect(css).toMatch(/\.ecd-ms__list\s*{[^}]*margin-left:\s*26px/s);
    expect(css).toMatch(/\.ecd-ms__name\s*{[^}]*var\(--weight-semibold\)/s);
  });

  it("son satırın bağlantı çizgisi çizilmez (mockup 118)", () => {
    expect(css).toMatch(
      /\.ecd-ms__group:last-child\s+\.ecd-ms__list\s+\.ecd-ms__row:last-child\s+\.ecd-ms__line\s*{[^}]*display:\s*none/s,
    );
  });

  /**
   * 🔴 NÜKS BEKÇİSİ (F-BLG T5'te ÖLÇÜLEREK bulundu).
   *
   * Başlıktaki iki buton `Button` primitive'idir, yani `.btn--md` ZATEN bir
   * yatay dolgu (16px) veriyor; `.ecd-head__btn` mockup'ın 14px'ini uygular.
   * İkisi de TEK SINIF seçici yazılırsa özgüllükleri EŞİTtir ve kazanan
   * yalnızca CSS demetindeki sıraya kalır — yani sayfaya eklenen HERHANGİ bir
   * yeni CSS import'u butonun genişliğini sessizce oynatabilir. Bu fiilen oldu:
   * bu dilim `EmployerItemFormModal`ı import edince `isveren-sozlesme-genel` ve
   * `-belgeler` kareleri 1061 piksel kaydı (kontrol: main'de taze baseline turu
   * commit'li PNG'yi BİREBİR üretiyordu → kayma bu dala aitti).
   *
   * Kural: kuralın kapsayıcıyla yazılması ÖZGÜLLÜĞÜ yükseltir ve mockup değeri
   * sıradan BAĞIMSIZ kazanır. Tek-sınıf hâline geri dönülürse bu test KIRMIZI.
   */
  it("başlık butonu kuralı SIRA-BAĞIMSIZDIR (kapsayıcıyla özgüllük)", () => {
    expect(css).toMatch(/\.ecd-head__actions\s+\.ecd-head__btn\s*{[^}]*padding:[^}]*14px/s);
    // Kapsayıcısız (satır başında duran) `.ecd-head__btn {` bloğu KALMAMALI —
    // `.ecd-head__actions .ecd-head__btn` satır başında `.ecd-head__actions`
    // ile başladığı için bu iddiaya TAKILMAZ.
    expect(css).not.toMatch(/^\.ecd-head__btn\s*{/m);
  });
});
