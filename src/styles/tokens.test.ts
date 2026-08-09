// @vitest-environment node
// Not: jsdom ortamında global `URL` whatwg-url polyfill'i ile değiştirilir ve
// `new URL(relative, import.meta.url)` file:// tabanını yanlış çözer
// (http://localhost:3000/... üretir). Bu saf metin testi dosya sistemi
// okuduğu için node ortamında çalıştırılır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const tokensCss = readFileSync(
  fileURLToPath(new URL("./tokens.css", import.meta.url)),
  "utf8",
);

/**
 * tokens.css'teki hex renk literali sayısı. Palet burada TANIMLANIR, bu yüzden
 * hex'in tek meşru yeri burasıdır; ama sayı sabittir — artması yeni bir rengin
 * gözden kaçtığı anlamına gelir (şantiye formu spec §5.1: yeni renk gerekmiyor).
 *
 * P7 T3 (Ekran 15 "Sözleşme İlerlemesi" çubukları): 69 → 70. Fiziksel çubuğunun
 * açık ucu (#4ade80, mockup 185) mevcut tonlarla karşılanmadığı için tek yeni
 * hex eklendi (`--color-success-light`); diğer iki gradyan mevcut token
 * çiftleriyle kuruldu, yeni hex taşımıyor.
 *
 * F-TH T5 (Şantiye Hakedişler "Taşeron Hakedişleri" panel başlığı): 70 → 72.
 * Mockup zemin/metin tonunun (#fff7ed/#c2410c) karşılığı YOKTU — iki yeni
 * token eklendi (`--color-orange-tint`/`--color-orange-tint-text`).
 *
 * F-SD T4 (Hakediş Özeti "Taşeron Hakediş →" bağlantısı, mockup satır 226):
 * 72 → 73. Zemin/metin tonu mevcut turuncu token çiftiyle karşılandı, yalnız
 * kenarlık tonunun (#fed7aa) karşılığı yoktu (`--color-orange-tint-border`).
 *
 * F-PL T2 (Planlama ızgarası): 73 → 74. Altı hücre renk etiketinin HEPSİ ve
 * grup başlığı renkleri mevcut token çiftleriyle karşılandı; yalnız hafta sonu
 * HÜCRE zemini (`--color-amber-tint-cell`, P132-133) yeniydi — başlık
 * satırının tonuyla (`--color-amber-tint`, P116) aynı DEĞİLDİR.
 *
 * F-PT T2 (Puantaj): 74 → 77. Hücre rozetlerinin zemin/metin tonlarının HEPSİ
 * mevcut token çiftleriyle karşılandı; yalnız legend çiplerinin ÜÇ kenarlık
 * tonunun karşılığı yoktu (`--color-primary-border-soft` E5 80/ŞP 107 ·
 * `--color-warning-border-soft` E5 83/ŞP 110 · `--color-success-border-soft`
 * ŞP 111). Dördüncü kenarlık (#fca5a5) zaten `--color-danger-border-soft`tur.
 *
 * F-PT T4 (Personel Ekle formu): 77 → 78. Mockup'ın renklerinin tamamı mevcut
 * palette karşılandı; yalnız belge uyarı kutusunun koyu kehribar metin tonu
 * (FP 196) yeniydi — mevcut `--color-warning-strong` ve
 * `--color-orange-tint-text` ondan AÇIK olduğu için kontrastı düşürürdü
 * (`--color-warning-deep-text`).
 *
 * F-P5 T7 (TSD · Taşeron Sözleşme Detayı): 78 → 79. Mockup'ın renklerinin
 * tamamı mevcut palette karşılandı (zincir rozetleri, kehribar bant, tfoot,
 * ilerleme çubuğu); YALNIZ bilgi bandının gövde metin tonu (TSD 83) yeniydi —
 * `--color-warning-strong` ondan AÇIK, `--color-warning-deep-text` ondan
 * KOYUdur (`--color-warning-body-text`).
 */
const EXPECTED_HEX_COUNT = 79;

describe("tokens.css", () => {
  it("çekirdek renk token'larını tanımlar (açık tema Slate + Blue)", () => {
    for (const token of [
      "--color-bg",
      "--color-surface",
      "--color-text",
      "--color-text-muted",
      "--color-border",
      "--color-primary",
      "--color-success",
      "--color-warning",
      "--color-danger",
    ]) {
      expect(tokensCss).toContain(token);
    }
  });

  it("tipografi, boşluk ve yarıçap token'larını tanımlar", () => {
    for (const token of [
      "--font-sans",
      "--font-mono",
      "--text-base",
      "--text-lg",
      "--space-4",
      "--radius-md",
      // F1 eklemeleri
      "--text-page-title",
      "--text-section",
      "--text-numeric",
      "--text-table-head",
      "--radius-14",
      "--shadow-card",
      "--focus-ring",
      "--color-surface-2",
      "--color-divider",
      "--anim-fade-up",
    ]) {
      expect(tokensCss).toContain(token);
    }
  });

  it("Ekran 13 (BOQ) token'ları tanımlı ve mockup değerlerini taşır", () => {
    // spec §3.5 — 13 yeni token; her değer mockup satır no ile gerekçeli.
    const boqTokens: ReadonlyArray<readonly [string, string]> = [
      ["--color-info-tint", "#f0f9ff"], // GENEL TOPLAM zemini (174)
      ["--border-width-total", "2px"], // GENEL TOPLAM üst çizgisi (174)
      ["--text-kpi-value", "20px"], // özet kartı değeri (75, 79, 83, 87)
      ["--text-boq-group", "12px"], // grup başlık satırı (108)
      ["--text-total-amount", "15px"], // genel toplam tutarı (176)
      ["--tracking-group", "0.5px"], // grup başlığı harf aralığı (108)
      ["--space-boq-cell-y", "11px"], // tablo hücre dikey iç boşluğu (96, 111)
      ["--space-boq-cell-x", "16px"], // Poz No / Tarif yatay iç boşluğu (96, 111)
      ["--space-boq-total-y", "13px"], // tfoot hücre dikey iç boşluğu (175, 176)
      ["--space-boq-kpi-label-gap", "5px"], // kart etiketi → değer (74)
      ["--space-boq-strip-gap", "20px"], // kart şeridi alt boşluğu (72)
      ["--space-boq-action-gap", "10px"], // iki buton arası (65)
      ["--space-boq-btn-x", "18px"], // birincil buton yatay iç boşluğu (67)
      ["--space-boq-crumb-gap", "6px"], // breadcrumb alt boşluğu (62)
    ];
    for (const [token, value] of boqTokens) {
      expect(tokensCss).toMatch(new RegExp(`${token}:\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*;`));
    }
  });

  it("Şantiye formu token'ları tanımlı ve mockup değerlerini taşır", () => {
    // spec §5.1 — 22 yeni token; kanon: projedesign "Form - Santiye Ekle.dc.html".
    // Her değer mockup satır no ile gerekçeli (parantez içi).
    const siteFormTokens: ReadonlyArray<readonly [string, string]> = [
      ["--radius-9", "9px"], // kutucuk kutusu, belge ikon kutusu (152, 160, 182)
      ["--leading-loose", "1.7"], // bilgi kutusu metni (55)
      ["--space-info-banner-y", "14px"], // bilgi kutusu dikey iç boşluk (53)
      ["--space-info-banner-x", "18px"], // bilgi kutusu yatay iç boşluk (53)
      ["--space-card-head-gap", "10px"], // Bölümler kartı başlık şeridi (103)
      ["--space-section-cell-y", "10px"], // bölüm tablosu hücre dikey (110–124)
      ["--space-section-cell-x", "12px"], // bölüm tablosu hücre yatay (111–124)
      ["--space-section-cell-x-lead", "16px"], // ilk sütun yatay (110, 119)
      ["--tracking-section-head", "0.7px"], // tablo başlığı harf aralığı (110–114)
      ["--width-col-responsible", "170px"], // Sorumlu sütunu (111)
      ["--width-col-date", "130px"], // Başlangıç / Bitiş sütunları (112, 113)
      ["--width-col-amount", "130px"], // Tahmini Bedel sütunu (114)
      ["--width-col-action", "40px"], // sil sütunu (115)
      ["--space-dashed-btn-y", "7px"], // "Bölüm ekle" butonu (136)
      ["--space-dashed-btn-x", "14px"], // "Bölüm ekle" butonu (136)
      ["--space-checkbox-list-gap", "7px"], // kutucuk listesi satır aralığı (152, 160)
      ["--size-checkbox-lg", "15px"], // alt şerit kutucuğu (221)
      ["--space-row-control-y", "6px"], // .row-in dikey iç boşluk (27)
      ["--space-row-control-x", "8px"], // .row-in yatay iç boşluk (27)
      ["--text-row-control", "12px"], // .row-in yazı boyu (27)
      ["--border-width-row-control", "1px"], // .row-in kenarlık (27)
      ["--radius-row-control", "var\\(--radius-6\\)"], // .row-in köşe (27)
      ["--space-form-action-gap", "10px"], // alt eylem grubu boşluğu (224)
    ];
    expect(siteFormTokens).toHaveLength(23);
    for (const [token, value] of siteFormTokens) {
      expect(tokensCss, `${token} tanımlı değil ya da değeri farklı`).toMatch(
        new RegExp(`${token}:\\s*${value}\\s*;`),
      );
    }
  });

  it("kart başlığı 14px token'ı tanımlıdır (mockup .card-t, satır 24)", () => {
    // 2026-07-30 düzeltmesi: `.pf-card__title` --text-body (13px) kullanıyordu.
    // İKİ form mockup'ı da (.card-t, satır 24) 14px/600 ilan ediyor; mockup
    // kazanır. Bu bilinçli bir sapma değil, fark edilmemiş bir kaymaydı.
    expect(tokensCss).toMatch(/--text-form-card-title:\s*14px\s*;/);
  });

  it("--radius-row-control yeni px icat etmez, mevcut --radius-6'ya bağlıdır", () => {
    // Mockup .row-in 6px köşe ister (27); repoda --radius-6 zaten var.
    expect(tokensCss).toMatch(/--radius-row-control:\s*var\(--radius-6\)\s*;/);
    expect(tokensCss).toMatch(/--radius-6:\s*6px\s*;/);
  });

  it("--tracking-section-head mevcut --tracking-wide'dan ayrı bir token'dır", () => {
    // Spec §5.1: mevcut --text-table-head 0.8px kullanır, bu form 0.7px ister.
    // Mevcut token'ı değiştirmek başka ekranları kaydırırdı → yeni token açıldı.
    expect(tokensCss).toMatch(/--tracking-wide:\s*0\.8px\s*;/);
    expect(tokensCss).toMatch(/--tracking-section-head:\s*0\.7px\s*;/);
  });

  it("şantiye formu için yeni renk token'ı eklenmedi", () => {
    // Spec §5.1 sonu: mockup'ın 19 rengi mevcut token'larda karşılanıyor.
    // Bu sayı artarsa yeni bir çıplak renk sızmış demektir.
    const hexCount = (tokensCss.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).length;
    expect(hexCount).toBe(EXPECTED_HEX_COUNT);
  });

  it("koyu tema varsayılanı yoktur — açık tema kanon", () => {
    // Açık tema kanon (README); koyu tema bu fazda YOK.
    expect(tokensCss).not.toContain("prefers-color-scheme: dark");
  });
});
