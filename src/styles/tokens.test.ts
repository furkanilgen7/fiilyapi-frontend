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
 */
const EXPECTED_HEX_COUNT = 69;

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
