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

  it("koyu tema varsayılanı yoktur — açık tema kanon", () => {
    // Açık tema kanon (README); koyu tema bu fazda YOK.
    expect(tokensCss).not.toContain("prefers-color-scheme: dark");
  });
});
