// @vitest-environment node
// KAPSAM UYARISI (site-diary-progress.css.test.ts ile aynı): bu dosya YALNIZCA
// stylesheet METNİNDE kuralın var olduğunu doğrular; cascade'i ya da
// tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama Playwright'ın işi).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./site-diary-detail.css", import.meta.url)), "utf8");
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(withoutComments);
  expect(match, selector).not.toBeNull();
  return match?.[1] ?? "";
}

describe("site-diary-detail.css — durum hapları (mockup İ:316 / GK:362)", () => {
  it("S1 — taslak hapı AMBER'dir (#fef3c7 / #d97706 token'ları), nötr gri DEĞİL", () => {
    const body = ruleBody(".diary-detail__pill--draft");
    expect(body).toMatch(/background:\s*var\(--color-warning-soft\)/);
    expect(body).toMatch(/color:\s*var\(--color-warning-strong\)/);
  });

  it("gönderildi hapı yeşildir (#dcfce7 / #16a34a token'ları)", () => {
    const body = ruleBody(".diary-detail__pill--submitted");
    expect(body).toMatch(/background:\s*var\(--color-success-soft\)/);
    expect(body).toMatch(/color:\s*var\(--color-success\)/);
  });

  it("çıplak hex YOKTUR — renkler token'dan gelir", () => {
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
