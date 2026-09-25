// @vitest-environment node
// KAPSAM UYARISI: yalnız stylesheet METNİNİ doğrular; görünüm Playwright'ın işidir.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./diary-detail-progress.css", import.meta.url)), "utf8");
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("diary-detail-progress.css — Saat Dağıtımı özeti", () => {
  it("diğer bölümlerin kodları soluk (.oth opacity .55)", () => {
    expect(withoutComments).toMatch(/\.ev-detail-hours__row--other\s*\{\s*opacity:\s*0\.55;/);
  });

  it("çıplak hex YOKTUR — renkler token'dan gelir", () => {
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
