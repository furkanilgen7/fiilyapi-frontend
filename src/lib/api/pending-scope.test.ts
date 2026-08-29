// @vitest-environment node
import { describe, expect, it } from "vitest";

import { isScopePending } from "./pending-scope";

describe("isScopePending — `undefined` (bilerek suzgecsiz) ile `\"\"` (henuz cozulmedi) AYRILIR", () => {
  it("hic anahtar verilmemisse BEKLEMEZ (bilerek suzgecsiz cagri)", () => {
    expect(isScopePending()).toBe(false);
    expect(isScopePending(undefined)).toBe(false);
    expect(isScopePending(undefined, undefined)).toBe(false);
  });

  it("dolu anahtar BEKLEMEZ", () => {
    expect(isScopePending("p-1")).toBe(false);
    expect(isScopePending("p-1", "s-1")).toBe(false);
  });

  // 🔴 ASIL İDDİA — bu dal olmadan ekran BİR RENDER boyunca TÜM projelerin
  // hakedişlerini kendi toplamına katardı.
  it("VERILIP bos kalan anahtar BEKLETIR", () => {
    expect(isScopePending("")).toBe(true);
    expect(isScopePending("p-1", "")).toBe(true);
    expect(isScopePending("", undefined)).toBe(true);
  });

  it("POZITIF KONTROL — `undefined` ile `\"\"` KARISTIRILMAZ", () => {
    // `key === undefined` yerine `!key` yazan bir mutant BURADA olur: liste
    // ekrani (suzgecsiz, `undefined`) sonsuza kadar bos kalirdi.
    expect(isScopePending(undefined)).toBe(false);
    expect(isScopePending("")).toBe(true);
  });
});
