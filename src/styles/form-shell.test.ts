// @vitest-environment node
// Saf metin (CSS kaynak) testi — form-control-metrics.test.ts / boq.css.test.ts
// deseni. T1'in tek gerçek riski kaskad kaymasıdır: aynı seçici hem
// form-shell.css'te hem project-form.css'te tanımlıysa hangisinin kazandığı
// import sırasına bağlı hale gelir. Bu test "kopyalandı mı, taşındı mı"
// sorusunu kapıya bağlar.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const shellCss = read("./form-shell.css");
const projectCss = read("../components/project-form/project-form.css");

/** Verilen kural başlığının (seçicinin) dosyada tanımlı olup olmadığı. */
function defines(css: string, selector: string): boolean {
  return css.includes(`${selector} {`) || css.includes(`${selector},`);
}

/** İki formun da kullandığı, form-shell.css'e TAŞINAN kural başlıkları. */
const SHARED_SELECTORS = [
  ".pf",
  ".pf-topbar",
  ".pf-breadcrumb",
  ".pf-breadcrumb__sep",
  ".pf-breadcrumb__current",
  ".pf-topbar__actions",
  ".pf-head",
  ".pf-title",
  ".pf-subtitle",
  ".pf-body",
  ".pf-form-error",
  ".pf-actions",
  ".pf-card",
  ".pf-card__title",
  ".pf-card__req",
  ".pf-card__note",
  ".pf-grid",
  ".pf-grid--2",
  ".pf-grid--3",
  ".pf-grid--4",
  ".pf-grid--2-1",
  ".pf-grid--2-1-1",
  ".pf-col-span-2",
  ".pf-docs__grid",
  ".pf-doc",
  ".pf-doc--drop",
  ".pf-doc__icon",
  ".pf-doc__text",
  ".pf-doc__title",
  ".pf-doc__sub",
  ".pf-doc__badge",
] as const;

/** Proje formuna özgü kalan bloklar — form-shell.css'e SIZMAMALI. */
const PROJECT_ONLY_SELECTORS = [
  ".pf-type-card",
  ".pf-margin",
  ".pf-site-row",
  ".pf-site-add",
  ".pf-card--employer",
  ".pf-shareholder-row",
  ".pf-escalation",
] as const;

describe("form-shell.css — paylaşılan form kabuğu", () => {
  it("form-shell.css .pf-card ve .pf-grid bloklarını taşır", () => {
    expect(defines(shellCss, ".pf-card")).toBe(true);
    expect(defines(shellCss, ".pf-grid")).toBe(true);
  });

  it("iki formun da kullandığı tüm kabuk seçicilerini tanımlar", () => {
    for (const selector of SHARED_SELECTORS) {
      expect(defines(shellCss, selector), `${selector} form-shell.css'te yok`).toBe(
        true,
      );
    }
  });

  it("project-form.css artık .pf-card tanımlamıyor (çift tanım = kaskad riski)", () => {
    expect(defines(projectCss, ".pf-card")).toBe(false);
    expect(defines(projectCss, ".pf-grid")).toBe(false);
  });

  it("taşınan hiçbir seçici project-form.css'te ikinci kez tanımlı değil", () => {
    for (const selector of SHARED_SELECTORS) {
      expect(
        defines(projectCss, selector),
        `${selector} iki dosyada birden tanımlı`,
      ).toBe(false);
    }
  });

  it("proje formuna özgü bloklar project-form.css'te kalır, kabuğa sızmaz", () => {
    for (const selector of PROJECT_ONLY_SELECTORS) {
      expect(defines(projectCss, selector), `${selector} project-form.css'te yok`).toBe(
        true,
      );
      expect(defines(shellCss, selector), `${selector} kabuğa sızmış`).toBe(false);
    }
  });

  it(".pf-card__title mockup'ın 14px başlık ölçüsünü kullanır (satır 24)", () => {
    // Şantiye VE proje mockup'ında `.card-t{font-size:14px}` (ikisinde de
    // satır 24). Kabuk 13px gövde token'ına bağlıysa iki form da kaymış olur.
    expect(shellCss).toMatch(
      /\.pf-card__title[^{]*\{[^}]*font-size:\s*var\(--text-form-card-title\)/,
    );
    expect(shellCss).not.toMatch(
      /\.pf-card__title[^{]*\{[^}]*font-size:\s*var\(--text-body\)/,
    );
  });

  it("eylem grubu boşluğu 10px token'ıdır, --space-2 (8px) değil (satır 224)", () => {
    // Şantiye mockup 224 ve proje mockup 212: `display:flex; gap:10px`.
    // --space-2 8px'tir; iki formda da butonlar birbirine 2px fazla yakındı.
    expect(shellCss).toMatch(
      /\.pf-actions\s*\{[^}]*gap:\s*var\(--space-form-action-gap\)/,
    );
    expect(shellCss).toMatch(
      /\.pf-actions--split \.pf-actions__group\s*\{[^}]*gap:\s*var\(--space-form-action-gap\)/,
    );
  });

  it("alt eylem şeridinin split varyantını tanımlar (mockup satır 219)", () => {
    expect(shellCss).toMatch(
      /\.pf-actions--split[^{]*{[^}]*justify-content:\s*space-between/,
    );
  });

  it("üç sütunlu belge ızgarası varyantını tanımlar (mockup satır 179)", () => {
    expect(shellCss).toMatch(
      /\.pf-docs__grid--3[^{]*{[^}]*grid-template-columns:\s*1fr 1fr 1fr/,
    );
  });
});
