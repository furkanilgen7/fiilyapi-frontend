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
const textareaCss = read("./textarea/textarea.css");
const checkboxCss = read("./checkbox/checkbox.css");

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
const textareaBlock = ruleBlock(textareaCss, ".textarea");

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
      "textarea.css": textareaCss,
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

describe("Textarea ayni form kontrolu olculerini tasir (F2)", () => {
  it("ayni cerceve, yazi tipi olcusu ve olcu token'lari (.f-in ailesi)", () => {
    expect(declaration(textareaBlock, "border")).toBe(
      declaration(inputBlock, "border"),
    );
    expect(declaration(textareaBlock, "font-size")).toBe(
      declaration(inputBlock, "font-size"),
    );
    expect(declaration(textareaBlock, "padding")).toBe(
      "var(--space-form-y) var(--space-form-x)",
    );
  });

  it("cok satirli olcu: line-height 1.5 ve resize kapali (spec §4.4)", () => {
    // Textarea tek satir degil; deterministik 20px yerine 1.5 satir yuksekligi
    // (Acik Adres rows=2). Kutu genisleyebilir gorunmesin diye resize kapatilir.
    expect(declaration(textareaBlock, "line-height")).toBe("1.5");
    expect(declaration(textareaBlock, "resize")).toBe("none");
  });
});

/* ── T2: satır-içi kontrol varyantı (şantiye mockup .row-in, satır 27) ─────── */

const inputRowBlock = ruleBlock(inputCss, ".input--row");
const selectRowBlock = ruleBlock(selectCss, ".select--row");

describe("row-control varyanti (mockup .row-in, satir 27)", () => {
  it("tokens.css row-control olculerini tanimlar", () => {
    expect(tokensCss).toMatch(/--space-row-control-y:\s*6px/);
    expect(tokensCss).toMatch(/--space-row-control-x:\s*8px/);
    expect(tokensCss).toMatch(/--text-row-control:\s*12px/);
    expect(tokensCss).toMatch(/--border-width-row-control:\s*1px/);
    expect(tokensCss).toMatch(/--radius-row-control:\s*var\(--radius-6\)/);
  });

  it("tokens.css --size-checkbox-lg tanimlar", () => {
    expect(tokensCss).toMatch(/--size-checkbox-lg:\s*15px/);
  });

  it("input size=row ve select size=row ayni yuksekligi uretir", () => {
    // Yukseklik = dikey ic bosluk + kenarlik + satir yuksekligi. Ucu de esit olmali.
    const verticalPadding = (block: string): string =>
      declaration(block, "padding").split(" ")[0];
    expect(verticalPadding(inputRowBlock)).toBe("var(--space-row-control-y)");
    expect(verticalPadding(selectRowBlock)).toBe("var(--space-row-control-y)");
    expect(declaration(inputRowBlock, "border-width")).toBe(
      declaration(selectRowBlock, "border-width"),
    );
    expect(declaration(inputRowBlock, "font-size")).toBe(
      declaration(selectRowBlock, "font-size"),
    );
  });

  it("row varyanti cıplak px kullanmaz, token'a baglidir", () => {
    for (const block of [inputRowBlock, selectRowBlock]) {
      expect(block).not.toMatch(/\d+px/);
      expect(declaration(block, "font-size")).toBe("var(--text-row-control)");
      expect(declaration(block, "border-width")).toBe(
        "var(--border-width-row-control)",
      );
      expect(declaration(block, "border-radius")).toBe(
        "var(--radius-row-control)",
      );
    }
  });

  it("checkbox lg varyanti --size-checkbox-lg'ye baglidir", () => {
    const block = ruleBlock(checkboxCss, ".checkbox--lg");
    expect(declaration(block, "width")).toBe("var(--size-checkbox-lg)");
    expect(declaration(block, "height")).toBe("var(--size-checkbox-lg)");
    expect(block).not.toMatch(/\d+px/);
  });

  it("varsayilan (size'siz) olculer degismedi — mevcut cagri noktalari korunur", () => {
    // Regresyon kapisi: .input / .select temel bloklari .f-in olcusunde kalir.
    expect(declaration(inputBlock, "font-size")).toBe("var(--text-body)");
    expect(declaration(selectBlock, "font-size")).toBe("var(--text-body)");
    expect(declaration(inputBlock, "border")).toMatch(/var\(--border-width-form\)/);
  });
});
