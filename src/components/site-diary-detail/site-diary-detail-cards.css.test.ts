// @vitest-environment node
// KAPSAM UYARISI (site-diary-detail.css.test.ts ile aynı): yalnız stylesheet
// METNİNİ doğrular; cascade/görünüm Playwright'ın işidir.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./site-diary-detail-cards.css", import.meta.url)), "utf8");
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(withoutComments);
  expect(match, selector).not.toBeNull();
  return match?.[1] ?? "";
}

describe("site-diary-detail-cards.css — Kural A görünümü (mockup .sep / .oth / .qk)", () => {
  it("'Diğer bölümler' satırları SOLUK (.oth opacity .55 — İ:386/712)", () => {
    expect(ruleBody(".diary-detail-lines__row--other")).toMatch(/opacity:\s*0\.55/);
  });

  it("'Bu bölüm' ayırıcısı vurgulu (#eff6ff zemin · #1d4ed8 metin · #bfdbfe çizgi token'ları)", () => {
    const body = ruleBody(".diary-detail-lines__sep--current > th");
    expect(body).toMatch(/background:\s*var\(--color-nav-active-bg\)/);
    expect(body).toMatch(/color:\s*var\(--color-primary-hover\)/);
    expect(body).toMatch(/border-bottom-color:\s*var\(--color-primary-ring\)/);
  });

  it("KPI ızgarası kutu sayısı kadar kolon (planlamasız / maskeli hâlde boşluk kalmaz)", () => {
    expect(ruleBody(".diary-detail__kpis")).toMatch(/repeat\(var\(--diary-detail-kpi-count, 5\)/);
  });

  it("çıplak hex YOKTUR — renkler token'dan gelir", () => {
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
