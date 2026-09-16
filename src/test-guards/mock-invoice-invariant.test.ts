// @vitest-environment node
//
// KAYIT 400 · `e2e/mock-backend.ts`teki `inv-out-1` fikstürü backend'in
// KENDİ para invaryantını (`backend/app/modules/invoicing/amounts.py`'nin
// 7 adımı) üç yerde ihlal ediyordu: Σline_total ≠ subtotal, advance_amount ve
// retention_amount oranlarından türeyen tutarlarla uyuşmuyordu. Bu bekçi
// `e2e/mock-backend.ts`i METİN olarak OKUR (koşturmaz — o dosya Playwright'a
// aittir) ve `inv-out-1` bloğunun rakamlarını backend formülüyle çapraz
// doğrular.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const mockBackendPath = fileURLToPath(new URL("../../e2e/mock-backend.ts", import.meta.url));

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

describe("mock-backend.ts · inv-out-1 para invaryantı (kayıt 400)", () => {
  const content = readFileSync(mockBackendPath, "utf-8");
  const blockMatch = content.match(/id:\s*"inv-out-1"[\s\S]*?\n {2}\},/);
  if (!blockMatch) throw new Error("inv-out-1 bloğu bulunamadı");
  const block = blockMatch[0];

  function field(name: string): number {
    const m = block.match(new RegExp(`(?<![a-zA-Z_])${name}:\\s*"(-?[\\d.]+)"`));
    if (!m) throw new Error(`${name} alanı bulunamadı`);
    return Number(m[1]);
  }

  const lineMatches = [
    ...block.matchAll(
      /mockLine\(\s*"(?:[^"\\]|\\.)*",\s*\d+,\s*"(?:[^"\\]|\\.)*",\s*"(?:[^"\\]|\\.)*",\s*"([\d.]+)",\s*"([\d.]+)"\s*\)/g,
    ),
  ];
  const lineTotals = lineMatches.map(([, qty, price]) => round2(Number(qty) * Number(price)));
  const subtotal = field("subtotal");
  const advanceRate = field("advance_rate");
  const retentionRate = field("retention_rate");
  const advanceAmount = field("advance_amount");
  const retentionAmount = field("retention_amount");
  const taxBase = field("tax_base");
  const vatAmount = field("vat_amount");
  const total = field("total");

  it("Σ line_total subtotal'e eşittir", () => {
    const expectedSubtotal = round2(lineTotals.reduce((a, b) => a + b, 0));
    expect(subtotal).toBe(expectedSubtotal);
  });

  it("advance_amount = round(subtotal × advance_rate / 100)", () => {
    expect(advanceAmount).toBe(round2((subtotal * advanceRate) / 100));
  });

  it("retention_amount = round(subtotal × retention_rate / 100)", () => {
    expect(retentionAmount).toBe(round2((subtotal * retentionRate) / 100));
  });

  it("tax_base = subtotal − advance_amount − retention_amount", () => {
    expect(taxBase).toBe(round2(subtotal - advanceAmount - retentionAmount));
  });

  it("vat_amount = round(tax_base × %20)", () => {
    expect(vatAmount).toBe(round2(taxBase * 0.2));
  });

  it("total = tax_base + vat_amount (tevkifat yok)", () => {
    expect(total).toBe(round2(taxBase + vatAmount));
  });
});
