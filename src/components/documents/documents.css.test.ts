// @vitest-environment node
// Saf metin (regresyon) testi — site-detail.css.test.ts ile aynı gerekçe:
// yalnız stylesheet METNİNDE kuralın var olduğunu doğrular; gerçek klavye
// davranışı SiteDocumentsView.test.tsx'te (rol/etkileşim) sınanır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./documents.css", import.meta.url)), "utf8");

describe("documents.css — odak halkaları (regresyon koruması)", () => {
  it("belge kartı :focus-visible ile mockup'ın vurgulu kenarlığını (ŞB 95) kullanır", () => {
    expect(css).toMatch(/\.sdoc-card:focus-visible\s*{[^}]*var\(--color-primary-ring\)/);
  });

  it("klasör bağlantısı :focus-visible odak halkası tanımlar", () => {
    expect(css).toMatch(/\.sdoc-folders__item:focus-visible\s*{[^}]*--focus-ring/);
  });

  it("'İndir' düğmesi :focus-visible odak halkası tanımlar", () => {
    expect(css).toMatch(/\.sdoc-recent__download\.btn:focus-visible\s*{[^}]*--focus-ring/);
  });

  // F-BC T4 — E12'de düğme yoktur, satırın KENDİSİ butondur (E12 170).
  it("tıklanabilir liste satırı :focus-visible odak halkası tanımlar", () => {
    expect(css).toMatch(/\.sdoc-recent__trigger:focus-visible\s*{[^}]*--focus-ring/);
  });
});

describe("documents.css — çıplak değer yasağı", () => {
  // Yorumlar hariç: mockup'ın hex değerini gerekçe olarak yazmak (tokens.css
  // ev üslubu) serbesttir; KURAL GÖVDESİNDE çıplak hex yasaktır.
  it("kural gövdelerinde ham hex rengi içermez (tüm renkler tokens.css'ten)", () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
