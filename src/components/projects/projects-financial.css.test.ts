// @vitest-environment node
/**
 * 🔴 MUTASYON DENETIMINDEN DOGDU. `variant === "financial"` dalini `false`a
 * ceviren mutant (mali satir ayirt edici sinifini HIC almasin) 21 birim testin
 * HEPSINDEN sag ciktI: jsdom sinif adina bakmiyordu ve kusuru yalniz gorsel
 * kapi gorurdu. Bu dosya kuralin KENDISINI kapiya bagliyor; ikizi
 * `ProjectCard.financial.test.tsx` icindeki sinif iddiasidir (biri sinifin
 * BASILDIGINI, digeri sinifin BIR ANLAMI OLDUGUNU bekciler).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./projects.css", import.meta.url)), "utf8");
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("projects.css — mali ilerleme cubugu (ONAYLI SAPMA 2026-08-27)", () => {
  it("mali dolgu fizikselden AYIRT EDILIR (kendi kurali vardir)", () => {
    expect(declarations).toMatch(/\.prj-progress--financial\s+\.prj-progress__fill\s*{/);
  });

  it("mali yuzde metni ikincil renkte, token uzerinden", () => {
    expect(declarations).toMatch(
      /\.prj-progress--financial\s+\.prj-progress__pct\s*{[^}]*var\(--color-/,
    );
  });

  it("bildirimlerde ciplak hex YOKTUR", () => {
    expect(declarations.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});
