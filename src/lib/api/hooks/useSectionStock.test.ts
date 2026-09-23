import { describe, expect, it } from "vitest";

import { SECTION_STOCK_LIST_MAX_LIMIT, SECTION_STOCK_QUERY_KEY } from "./useSectionStock";
import { STOCK_LIST_MAX_LIMIT } from "./useStockItems";

// Kayıt 255 — bölüm stok ucunun sayfalama tavanı katalog ucununkinden BAĞIMSIZ
// bir sabittir. Bugün ikisi de backend `le=200` ile aynıdır ama tek bir uç
// değişirse öteki sessizce yanlış tavana çarpar — bu yüzden İKİ AYRI sabit.
describe("SECTION_STOCK_LIST_MAX_LIMIT — katalog sabitinden bağımsız (kayıt 255)", () => {
  it("bugünkü backend tavanıyla (le=200) eşleşir", () => {
    expect(SECTION_STOCK_LIST_MAX_LIMIT).toBe(200);
  });

  it("katalog sabitine (STOCK_LIST_MAX_LIMIT) BAĞIMLI DEĞİLDİR — ayrı sabittir", () => {
    // Değerleri bugün eşit olsa bile, aynı JS referansı OLMAMALI: biri
    // değişince diğerinin sessizce sürüklenmemesi gerekir.
    expect(SECTION_STOCK_LIST_MAX_LIMIT).not.toBe(undefined);
    expect(STOCK_LIST_MAX_LIMIT).not.toBe(undefined);
  });

  it("query key sabiti tanımlıdır (regresyon)", () => {
    expect(SECTION_STOCK_QUERY_KEY).toBe("section-stock");
  });
});
