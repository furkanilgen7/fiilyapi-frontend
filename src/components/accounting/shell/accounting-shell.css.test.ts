// @vitest-environment node
// `accounting.css.test.ts` ile AYNI gerekçe: dosya sistemi okuyan saf metin
// testi. Kuralın METİNDE var olduğunu doğrular, cascade'i DOĞRULAMAZ (görsel
// doğrulama T6'nın işi). Amaç HP'ye bağlı ölçü/renk kararlarının sessizce
// silinmesine karşı regresyon korumasıdır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./accounting-shell.css", import.meta.url)),
  "utf8",
);

describe("accounting-shell.css — HP:28-38", () => {
  it("sidebar SABİT ve topbar'ın altındadır (kabuk deseni)", () => {
    expect(css).toMatch(/\.mu-shell-sidebar\s*{[^}]*position:\s*fixed/);
    expect(css).toMatch(/\.mu-shell-sidebar\s*{[^}]*top:\s*52px/);
  });

  it("🔴 genişlik `--sidebar-width`tir (HP:28 = 220px) — içerik ofseti gerekmez", () => {
    expect(css).toMatch(/\.mu-shell-sidebar\s*{[^}]*width:\s*var\(--sidebar-width\)/);
    // Ayarlar/drill emsallerindeki negatif margin düzeltmesi BURADA OLMAMALI:
    // genişlik global sidebar'la aynı olduğu için eklenirse içerik kayar.
    expect(css).not.toMatch(/\.muhasebe-content\s*{[^}]*margin:/);
  });

  it("alt sekmeler girintilidir (HP:31)", () => {
    expect(css).toMatch(/\.mu-shell-nav--sub \.mu-shell-item\s*{[^}]*margin-left:\s*20px/);
  });

  it("aktif sekme HP:32'nin zemin/metin çiftini taşır", () => {
    expect(css).toMatch(/\.mu-shell-item--active\s*{[^}]*var\(--color-primary-soft\)/);
    expect(css).toMatch(/\.mu-shell-item--active\s*{[^}]*var\(--color-primary-hover\)/);
  });

  it("🔴 devre dışı sekmenin gerekçesi BLOK olarak basılır (gizlenmez)", () => {
    expect(css).toMatch(/\.mu-shell-item__reason\s*{[^}]*display:\s*block/);
    // `display:none` ya da görsel gizleme gerekçeyi ekrandan kaldırırdı.
    expect(css).not.toMatch(/\.mu-shell-item__reason\s*{[^}]*display:\s*none/);
  });

  it("🔴 BEKÇİ: çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
