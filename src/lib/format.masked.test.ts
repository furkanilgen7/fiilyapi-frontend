import { describe, expect, it } from "vitest";

import {
  EMPTY_CELL,
  formatAmount,
  formatCompactCurrency,
  formatCurrency,
  formatCurrencyPrecise,
  formatDecimal,
  formatPercent,
  formatQuantity,
} from "./format";

/**
 * Kapsam maskesi (backend `core/field_scope`, kullanici karari 2026-09-19) para
 * ve metraj alanlarini `null` dondurur: `limited` rol tutari, `finance` rol
 * metraji GOREMEZ.
 *
 * 🔴 Bicimlendiriciler bunu ISLEMEK ZORUNDA. `Number(null)` **0**'dir — yani
 * null-toleranssiz bir bicimlendirici gizlenmis bir tutari ekranda "₺ 0,00"
 * diye basardi. Bu, gizlemekten DAHA KOTUDUR: kullanici sahte bir sayi gorur ve
 * ona dayanarak karar verir.
 *
 * Gosterim urunun ZATEN kanonik olan bos hucresidir: "—".
 */
describe("bicimlendiriciler maskelenmis (null) degeri isler", () => {
  const bicimlendiriciler = {
    formatCompactCurrency,
    formatCurrency,
    formatCurrencyPrecise,
    formatAmount,
    formatPercent,
    formatQuantity,
  };

  for (const [ad, fn] of Object.entries(bicimlendiriciler)) {
    it(`${ad}: null ve undefined icin "—" doner`, () => {
      expect(fn(null)).toBe(EMPTY_CELL);
      expect(fn(undefined)).toBe(EMPTY_CELL);
    });
  }

  it("formatDecimal: null icin '—' doner", () => {
    expect(formatDecimal(null, 2)).toBe(EMPTY_CELL);
  });

  it("🔴 POZITIF KONTROL — gercek deger BOZULMAZ", () => {
    expect(formatCurrency("1500")).not.toBe(EMPTY_CELL);
    expect(formatQuantity("12.5")).not.toBe(EMPTY_CELL);
    expect(formatPercent("42")).not.toBe(EMPTY_CELL);
  });

  it("🔴 SIFIR maskelenmis DEGILDIR — '—' basilmaz", () => {
    expect(formatCurrency("0")).not.toBe(EMPTY_CELL);
    expect(formatCurrency(0)).not.toBe(EMPTY_CELL);
    expect(formatQuantity(0)).not.toBe(EMPTY_CELL);
  });
});
