// @vitest-environment node
// Not: tokens.test.ts ile aynı gerekçe — dosya sistemi okuyan saf metin testi.
//
// KAPSAM UYARISI (site-planning.css.test.ts ile aynı): bu dosya YALNIZCA
// stylesheet METNİNDE ilgili kuralın var olduğunu doğrular; cascade'i ya da
// tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T8'in işi). Amaç,
// mockup'a bağlı renk/ölçü kararlarının sessizce silinmesine karşı regresyon
// korumasıdır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./contracts.css", import.meta.url)), "utf8");

describe("contracts.css — SZL mockup'ına bağlı kurallar", () => {
  it("dört ilerleme tonunun HEPSİ tanımlıdır (60/70/80/90/100)", () => {
    for (const [tone, token] of [
      ["complete", "--color-success"],
      ["high", "--color-accent-purple-grad-start"],
      ["mid", "--color-primary"],
      ["low", "--color-warning"],
    ]) {
      expect(css, tone).toMatch(
        new RegExp(`\\.szl-progress__fill--${tone}\\s*{[^}]*var\\(${token}\\)`),
      );
    }
  });

  it("%100 satırında ray zemini de yeşile döner (70)", () => {
    expect(css).toMatch(
      /\.szl-progress__track--complete\s*{[^}]*var\(--color-success-soft\)/,
    );
  });

  it("KPI değer renkleri karta özeldir (35-38: nötr · yeşil · mavi · kehribar)", () => {
    for (const [modifier, token] of [
      ["neutral", "--color-text"],
      ["success", "--color-success"],
      ["primary", "--color-primary"],
      ["warning", "--color-warning"],
    ]) {
      expect(css, modifier).toMatch(
        new RegExp(`\\.szl-kpi__value--${modifier}\\s*{[^}]*var\\(${token}\\)`),
      );
    }
  });

  it("seçili sekme beyaz zemin + gölge taşır (27)", () => {
    expect(css).toMatch(
      /\.szl-tabs__tab--active\s*{[^}]*var\(--color-surface\)[^}]*var\(--shadow-tab-active\)/,
    );
  });

  it("'Beklemede' rozeti primitive'den KOYU metin tonu kullanır (91)", () => {
    expect(css).toMatch(/\.szl-badge--on-hold\s*{[^}]*var\(--color-warning-strong\)/);
  });

  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
