// @vitest-environment node
// `accounting-shell.css.test.ts` ile AYNI gerekçe: dosya sistemi okuyan saf
// metin testi. Kuralın METİNDE var olduğunu doğrular, cascade'i DOĞRULAMAZ
// (görsel doğrulama ayrı bir görevin işi). Amaç BL'ye bağlı ölçü/renk
// kararlarının sessizce silinmesine karşı regresyon korumasıdır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./financial-statements-shell.css", import.meta.url)),
  "utf8",
);

describe("financial-statements-shell.css — BL:24-31", () => {
  it("sidebar SABİT ve topbar'ın altındadır (kabuk deseni)", () => {
    expect(css).toMatch(/\.fs-shell-sidebar\s*{[^}]*position:\s*fixed/);
    expect(css).toMatch(/\.fs-shell-sidebar\s*{[^}]*top:\s*52px/);
  });

  it("🔴 genişlik `--sidebar-width`tir (BL:24 = 220px) — içerik ofseti gerekmez", () => {
    expect(css).toMatch(/\.fs-shell-sidebar\s*{[^}]*width:\s*var\(--sidebar-width\)/);
    expect(css).not.toMatch(/\.mali-tablolar-content\s*{[^}]*margin:/);
  });

  it("alt sekmeler girintilidir (BL:28)", () => {
    expect(css).toMatch(/\.fs-shell-nav--sub \.fs-shell-item\s*{[^}]*margin-left:\s*20px/);
  });

  it("🔴 İKİ VURGU KATMANI da vardır ve AYNI zemine düşmezler", () => {
    // BL:29 — bulunulan ekran KOYU ikili.
    expect(css).toMatch(/\.fs-shell-item--current\s*{[^}]*var\(--color-primary-soft\)/);
    expect(css).toMatch(/\.fs-shell-item--current\s*{[^}]*var\(--color-primary-hover\)/);
    // BL:27 — ata AÇIK ikili.
    expect(css).toMatch(/\.fs-shell-item--ancestor\s*{[^}]*var\(--color-nav-active-bg\)/);
    // İki ton eşitlenirse sidebar hangi ekranda olunduğunu SÖYLEMEZ.
    expect(/\.fs-shell-item--ancestor\s*{[^}]*var\(--color-primary-soft\)/.test(css)).toBe(false);
  });

  it("🔴 F-MT2 K3 — YANSITICI satır `devre dışı` tonuna DÜŞMEZ", () => {
    // Uç açıldı; "henüz yok" tonu çalışan bir ekranla ÇELİŞİRDİ. Eski
    // `--disabled`/`__reason` kuralları tüketicileriyle birlikte SİLİNDİ.
    expect(css).toMatch(/\.fs-shell-item--mirror\s*{[^}]*var\(--color-text-secondary\)/);
    expect(css).not.toMatch(/fs-shell-item--disabled/);
    expect(css).not.toMatch(/fs-shell-item__reason/);
  });

  it("🔴 K3 — yansıtıcı satırın KÖKTEKİ vurgusu `--current` ile AYNI ikilidir", () => {
    expect(css).toMatch(/\.fs-shell-item--mirror-current\s*{[^}]*var\(--color-primary-soft\)/);
    expect(css).toMatch(/\.fs-shell-item--mirror-current\s*{[^}]*var\(--color-primary-hover\)/);
  });

  it("🔴 BEKÇİ: çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
