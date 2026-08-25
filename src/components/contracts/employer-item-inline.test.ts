import { describe, it, expect } from "vitest";

import { commitInlineCell } from "./employer-item-inline";

/**
 * 🔴 BU DOSYANIN VAR OLMA SEBEBİ: `EmployerContractItemUpdate` şemasından
 * üretilen TS tipi `quantity?: number | string | null` der — "sıfırdan
 * büyük" DEMEZ. Yani `pnpm typecheck` yeşilken canlı 422 verebilir. Kısıt
 * ancak burada bekçilenir.
 */
describe("commitInlineCell · satır-içi hücre kaydetme kararı", () => {
  it("dokunulmamış hücre istek UÇURMAZ", () => {
    expect(commitInlineCell("quantity", undefined, "3200.000")).toEqual({ kind: "noop" });
  });

  it("değeri değişmemiş hücre istek UÇURMAZ (sondaki sıfırlar gösterimden düşer)", () => {
    expect(commitInlineCell("quantity", "3200", "3200.000")).toEqual({ kind: "noop" });
    expect(commitInlineCell("unitPrice", "1850", "1850.00")).toEqual({ kind: "noop" });
  });

  it("değişen miktar KISMİ gövde üretir — metin AYNEN gider, Number() turu yok", () => {
    expect(commitInlineCell("quantity", " 3200.125 ", "3200.000")).toEqual({
      kind: "patch",
      body: { quantity: "3200.125" },
    });
  });

  it("değişen birim fiyat yalnız `unit_price` taşır (miktar gövdeye girmez)", () => {
    expect(commitInlineCell("unitPrice", "1900.50", "1850.00")).toEqual({
      kind: "patch",
      body: { unit_price: "1900.50" },
    });
  });

  // 🔴 EMRİN ADIYLA İSTEDİĞİ SINAV: `min={0}` yazmak YANLIŞTIR, sıfır DAHİL
  // DEĞİLDİR (`exclusiveMinimum: 0`).
  it("miktar SIFIR REDDEDİLİR — istek uçmaz", () => {
    expect(commitInlineCell("quantity", "0", "3200.000")).toEqual({
      kind: "error",
      message: "Miktar sıfırdan büyük olmalıdır.",
    });
  });

  it("negatif miktar reddedilir", () => {
    expect(commitInlineCell("quantity", "-5", "3200.000")).toEqual({
      kind: "error",
      message: "Miktar sıfırdan büyük olmalıdır.",
    });
  });

  it("boşaltılan miktar SİLME DEĞİLDİR — reddedilir", () => {
    expect(commitInlineCell("quantity", "", "3200.000")).toEqual({
      kind: "error",
      message: "Miktar zorunludur.",
    });
  });

  it("sayı olmayan miktar reddedilir", () => {
    expect(commitInlineCell("quantity", "abc", "3200.000")).toEqual({
      kind: "error",
      message: "Miktar sayı olmalıdır.",
    });
  });

  it("negatif birim fiyat reddedilir (`minimum: 0`)", () => {
    expect(commitInlineCell("unitPrice", "-1", "1850.00")).toEqual({
      kind: "error",
      message: "Birim Fiyat negatif olamaz.",
    });
  });

  it("birim fiyat SIFIR KABUL EDİLİR — miktarın tersine sıfır sınıra DAHİLDİR", () => {
    expect(commitInlineCell("unitPrice", "0", "1850.00")).toEqual({
      kind: "patch",
      body: { unit_price: "0" },
    });
  });

  it("İŞV tarafında boş birim fiyat 'girilmedi' DEĞİLDİR — reddedilir", () => {
    // Taşeron emsalinde boş fiyat `null` gider; işveren şemasında `unit_price`
    // ZORUNLUdur ("Fiyatsız poz girilemez", İŞV 94) — iki kural KARIŞTIRILMAZ.
    expect(commitInlineCell("unitPrice", "", "1850.00")).toEqual({
      kind: "error",
      message: "Birim Fiyat zorunludur.",
    });
  });
});
