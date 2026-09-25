// @vitest-environment node
// KAPSAM UYARISI (document-form.css.test.ts ile aynı): bu dosya YALNIZCA
// stylesheet METNİNDE ilgili kuralın var olduğunu doğrular; cascade'i ya da
// tarayıcıdaki görünümü DOĞRULAMAZ (jsdom medya sorgusu çalıştırmaz; görsel
// doğrulama Playwright'ın işi).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./diary-progress.css", import.meta.url)), "utf8");
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

/** `@media (max-width: 1024px) { … }` bloğunun gövdesi (iç içe süslü parantezleri sayar). */
function tabletBlock(): string {
  const start = withoutComments.indexOf("@media (max-width: 1024px)");
  expect(start).toBeGreaterThan(-1);
  const open = withoutComments.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < withoutComments.length; i += 1) {
    if (withoutComments[i] === "{") depth += 1;
    if (withoutComments[i] === "}") depth -= 1;
    if (depth === 0) return withoutComments.slice(open + 1, i);
  }
  throw new Error("kapanmamış @media bloğu");
}

/** Medya sorgusu DIŞINDAKİ kurallar. */
function baseRules(): string {
  return withoutComments.replace(tabletBlock(), "");
}

describe("diary-progress.css — F2.6 tablet (İ:527-558)", () => {
  it("tablet yalnız-düzeni masaüstünde GİZLİ (display:none → ekran okuyucudan da gizli)", () => {
    expect(baseRules()).toMatch(/\.ev-diary-block \.ev-diary-tablet-only\s*{[^}]*display:\s*none/);
  });

  it("≤1024 px: tablet düzeni açılır, masaüstü eşleri gizlenir", () => {
    const block = tabletBlock();
    expect(block).toMatch(/\.ev-diary-block \.ev-diary-tablet-only\s*{[^}]*display:\s*flex/);
    expect(block).toMatch(/\.ev-diary-block \.ev-diary-desktop-only\s*{[^}]*display:\s*none/);
  });

  it("masaüstü-yalnız sınıfı medya sorgusu DIŞINDA gizlenmez (masaüstü düzeni değişmez)", () => {
    expect(baseRules()).not.toMatch(/\.ev-diary-desktop-only\s*{[^}]*display:\s*none/);
  });

  it("gizleme kuralları iki sınıflı özgüllükte (tek sınıflı `.btn`/`.ev-diary-alloc__head` display'ini demet sırasından bağımsız ezer)", () => {
    expect(withoutComments).not.toMatch(/(^|})\s*\.ev-diary-(tablet|desktop)-only\s*{/);
  });

  it("ızgara: ilk kolon yapışkan + yatay kaydırma; dokunmatik hedefler ≥ 36 px", () => {
    expect(withoutComments).toMatch(/\.ev-diary-grid-scroll\s*{[^}]*overflow-x:\s*auto/);
    expect(withoutComments).toMatch(/\.ev-diary-grid__lead\s*{[^}]*position:\s*sticky;[^}]*left:\s*0/);
    const block = tabletBlock();
    expect(block).toMatch(/\.ev-diary-grid__select\s*{[^}]*width:\s*36px;[^}]*height:\s*36px/);
    expect(block).toMatch(/\.input\.ev-diary-cell__input\s*{[^}]*height:\s*40px/);
    expect(block).toMatch(/\.btn\.ev-diary-btn\s*{[^}]*height:\s*40px/);
  });

  it("tablet şeridi hapı iki tonlu (İ:530 uBg/uFg/uBd)", () => {
    expect(withoutComments).toMatch(/\.ev-diary-tablet-head__pill--ok\s*{[^}]*var\(--color-success-tint\)/);
    expect(withoutComments).toMatch(/\.ev-diary-tablet-head__pill--warn\s*{[^}]*var\(--color-warning-soft\)/);
  });
});

describe("diary-progress.css — karar 5 · 6", () => {
  it("kilit bandı İ:144 çerçevesi (topBanner'da tam genişlik)", () => {
    expect(withoutComments).toMatch(/\.ev-diary-lock\s*{[^}]*border:\s*1px solid var\(--color-border-strong\)/);
    expect(withoutComments).toMatch(/\.ev-diary-lock\s*{[^}]*background:\s*var\(--color-surface-muted\)/);
  });

  it("Gönder düğmesi pasifken mockup gri zemini (İ:504 sendBg), soluk yeşil değil", () => {
    expect(withoutComments).toMatch(/\.btn\.ev-diary-send:disabled\s*{[^}]*background:\s*var\(--color-text-subtle\)/);
  });

  it("YENİ çipi kuralı kalmadı (karar 2)", () => {
    expect(withoutComments).not.toMatch(/\.ev-diary-chip\b/);
  });

  it("çıplak hex YOKTUR — tüm renkler token üzerinden gelir", () => {
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
