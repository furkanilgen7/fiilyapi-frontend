// @vitest-environment node
// KAPSAM UYARISI (site-diary-progress.css.test.ts ile aynı): yalnız stylesheet
// METNİNİ doğrular; cascade/görünüm Playwright'ın işidir (gunluk-kayit kareleri).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./site-diary.css", import.meta.url)), "utf8");
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(withoutComments);
  expect(match, selector).not.toBeNull();
  return match?.[1] ?? "";
}

describe("site-diary.css — Son Kayıtlar rozetleri (DET-1.3 · CEO kararı b)", () => {
  it("taslak rozeti AMBER'dir (İ:316 #fef3c7 / #d97706 token'ları) — nötr gri DEĞİL", () => {
    const body = ruleBody(".diary-recent__badge--draft");
    expect(body).toMatch(/background:\s*var\(--color-warning-soft\)/);
    expect(body).toMatch(/color:\s*var\(--color-warning-strong\)/);
  });

  it("gönderildi rozeti yeşil kalır (GK:362)", () => {
    const body = ruleBody(".diary-recent__badge--submitted");
    expect(body).toMatch(/background:\s*var\(--color-success-soft\)/);
    expect(body).toMatch(/color:\s*var\(--color-success\)/);
  });
});
