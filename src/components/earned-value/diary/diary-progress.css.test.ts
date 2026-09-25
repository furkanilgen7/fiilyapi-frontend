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

/**
 * F-SUBPX — Saat Dağıtımı ızgarasının BÜTÜN satırları tam piksel yükseklikte.
 *
 * ÖLÇÜLDÜ (DET-1): gövdenin 1.5 mirasıyla 12.5/10.5/11.5 px metin 18.75/15.75/
 * 17.25 px satır verdi → gövde satırı 45.5, ayırıcı 28.75, başlık 61.297, toplam
 * 35.75, PF 36.75 px; satır sınırları yarım/çeyrek pikselde kaldı ve yapışkan
 * kişi kolonu iki Linux baseline turunda FARKLI rasterlendi (1 px kayma).
 * Satır yüksekliğini belirleyen her metin `--leading-ev-diary-*` taşır ve bu
 * token'lar TAM px'tir. Tarayıcıdaki sonucu (satır üstleri tam sayı) bu test
 * DOĞRULAMAZ — yalnız kuralın metnini bekçiler.
 */
describe("diary-progress.css — F-SUBPX ızgara satır aralıkları tam piksel", () => {
  const tokensCss = readFileSync(fileURLToPath(new URL("../../../styles/tokens.css", import.meta.url)), "utf8");

  /** Seçicinin TEK BAŞINA yazıldığı kural gövdeleri (seçici listesi `a, b {` sayılmaz). */
  function ruleBody(source: string, selector: string): string {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const bodies = [...source.matchAll(new RegExp(`(?:^|})\\s*${escaped}\\s*{([^}]*)}`, "g"))].map((match) => match[1]);
    expect(bodies.length, `${selector} kuralı yok`).toBeGreaterThan(0);
    return bodies.join("\n");
  }

  it("--leading-ev-diary-* token'larının HEPSİ tam px", () => {
    const tokens = [...tokensCss.matchAll(/(--leading-ev-diary-[\w-]+):\s*([^;]+);/g)];
    expect(tokens.map(([, name]) => name).sort()).toEqual([
      "--leading-ev-diary-code",
      "--leading-ev-diary-meta",
      "--leading-ev-diary-pf",
      "--leading-ev-diary-row",
      "--leading-ev-diary-row-tablet",
      "--leading-ev-diary-rule",
    ]);
    for (const [, name, value] of tokens) {
      expect(value.trim(), `${name} tam px değil`).toMatch(/^\d+px$/);
    }
  });

  it.each([
    [".ev-diary-grid__lead--head", "meta"],
    [".ev-diary-grid__remain--head", "meta"],
    [".ev-diary-grid__code-name", "code"],
    [".ev-diary-rule", "rule"],
    [".ev-diary-grid__sep th", "meta"],
    [".ev-diary-grid__name", "row"],
    [".ev-diary-grid__job", "meta"],
    [".ev-diary-grid__changed", "meta"],
    [".ev-diary-grid__hours", "row"],
    [".ev-diary-grid__total > *", "row"],
    [".ev-diary-grid__pf > *", "row"],
    [".ev-diary-grid__pf .ev-diary-pf", "pf"],
  ])("%s satır aralığı --leading-ev-diary-%s", (selector, token) => {
    expect(ruleBody(baseRules(), selector)).toMatch(new RegExp(`line-height:\\s*var\\(--leading-ev-diary-${token}\\)`));
  });

  it("tablet ad satırı (14 px) kendi tam px satır aralığını taşır", () => {
    expect(tabletBlock()).toMatch(/\.ev-diary-grid__name\s*{[^}]*line-height:\s*var\(--leading-ev-diary-row-tablet\)/);
  });

  it("ızgarada kesirli satır aralığı üreten çarpan (1.2 · 1.5 …) YOKTUR", () => {
    const grid = withoutComments.slice(withoutComments.indexOf(".ev-diary-grid-scroll"), withoutComments.indexOf(".ev-diary-submit {"));
    expect(grid.length).toBeGreaterThan(0);
    expect(grid).not.toMatch(/line-height:\s*[\d.]+\s*;/);
  });

  it("karışık yazı boylu satır kutusu kesir üretmez: kip düğmesi blok, PF rozeti/metni üste hizalı", () => {
    expect(ruleBody(baseRules(), ".ev-diary-rule")).toMatch(/display:\s*block/);
    expect(ruleBody(baseRules(), ".ev-diary-grid__pf .ev-diary-pf")).toMatch(/vertical-align:\s*top/);
    expect(ruleBody(baseRules(), ".ev-diary-grid__pf .ev-diary-muted")).toMatch(/vertical-align:\s*top/);
  });
});
