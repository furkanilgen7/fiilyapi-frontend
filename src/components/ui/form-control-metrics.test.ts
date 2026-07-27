// @vitest-environment node
// Not: saf metin (CSS kaynak) testi — jsdom layout hesaplamadigi icin kutu
// modeli parity'si CSS bildirimlerinden dogrulanir. Ayrica bkz. tokens.test.ts.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const tokensCss = read("../../styles/tokens.css");
const inputCss = read("./input/input.css");
const selectCss = read("./select/select.css");

/** Verilen selector'un ilk kural blogunu (suslu parantez icini) dondurur. */
function ruleBlock(css: string, selector: string): string {
  const index = css.indexOf(`${selector} {`);
  expect(index, `${selector} kurali bulunamadi`).toBeGreaterThanOrEqual(0);
  const start = css.indexOf("{", index);
  const end = css.indexOf("}", start);
  // Yorumlar bildirim ayrimini bozmasin diye temizlenir.
  return css.slice(start + 1, end).replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Bir bloktaki tek bir bildirimin degerini dondurur. */
function declaration(block: string, property: string): string {
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:([^;]+)`).exec(block);
  expect(match, `${property} bildirimi bulunamadi`).not.toBeNull();
  return match![1].trim().replace(/\s+/g, " ");
}

const inputBlock = ruleBlock(inputCss, ".input");
const selectBlock = ruleBlock(selectCss, ".select");

describe("form kontrolu olcu token'lari", () => {
  it("tokens.css form kontrolu olcu token'larini tanimlar (mockup .f-in)", () => {
    // projedesign/"Form - *.dc.html" ortak .f-in: 1.5px cerceve, 9px 12px ic bosluk
    expect(tokensCss).toMatch(/--border-width-form:\s*1\.5px/);
    expect(tokensCss).toMatch(/--space-form-y:\s*9px/);
    expect(tokensCss).toMatch(/--space-form-x:\s*var\(--space-3\)/);
  });

  it("tum form kontrolu stilleri ciplak px yerine olcu token'larini kullanir", () => {
    const controlCss = {
      "input.css": inputCss,
      "select.css": selectCss,
      "company-screen.css": read("../settings/company/company-screen.css"),
      "audit-screen.css": read("../settings/audit/audit-screen.css"),
      "users-screen.css": read("../settings/users/users-screen.css"),
    };
    for (const [name, css] of Object.entries(controlCss)) {
      expect(css, `${name} --border-width-form kullanmali`).toContain(
        "var(--border-width-form)",
      );
      expect(css, `${name} --space-form-y kullanmali`).toContain(
        "var(--space-form-y)",
      );
      expect(css, `${name} --space-form-x kullanmali`).toContain(
        "var(--space-form-x)",
      );
    }
  });
});

describe("Input ve Select ayni satir yuksekligini uretir", () => {
  it("ayni yazi tipi olcusu ve deterministik satir yuksekligi tasir", () => {
    expect(declaration(selectBlock, "font-size")).toBe(
      declaration(inputBlock, "font-size"),
    );
    // Tam sayi satir yuksekligi: kesirli yukseklik subpixel yuvarlama ile
    // gorsel snapshot'ta 1px oynamaya yol aciyor.
    expect(declaration(inputBlock, "line-height")).toBe("20px");
    expect(declaration(selectBlock, "line-height")).toBe("20px");
  });

  it("ayni cerceve kalinligini tasir", () => {
    expect(declaration(selectBlock, "border")).toBe(
      declaration(inputBlock, "border"),
    );
    expect(declaration(inputBlock, "border")).toContain(
      "var(--border-width-form)",
    );
  });

  it("ayni dikey ic boslugu tasir (yukseklik birebir esit)", () => {
    // padding kisayolu: <y> <x>  |  <y> <sag> <y> <sol>
    const verticalPadding = (block: string): string => {
      const parts = declaration(block, "padding").split(" ");
      expect(parts.length === 2 || parts.length === 4).toBe(true);
      if (parts.length === 4) {
        expect(parts[0], "ust/alt ic bosluk esit olmali").toBe(parts[2]);
      }
      return parts[0];
    };
    expect(verticalPadding(inputBlock)).toBe("var(--space-form-y)");
    expect(verticalPadding(selectBlock)).toBe("var(--space-form-y)");
  });

  it("yatay ic bosluk token'i sol tarafta ayni (chevron icin sag genis)", () => {
    expect(declaration(inputBlock, "padding")).toBe(
      "var(--space-form-y) var(--space-form-x)",
    );
    expect(declaration(selectBlock, "padding")).toBe(
      "var(--space-form-y) var(--space-8) var(--space-form-y) var(--space-form-x)",
    );
  });
});
