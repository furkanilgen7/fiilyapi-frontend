import { describe, it, expect } from "vitest";

import {
  bestPriceQuotes,
  buildQuoteComparison,
  requestMaterialLabel,
  requestQuantityUnit,
} from "./quote-comparison";
import type { PurchaseQuoteCard } from "@/lib/api/hooks/useQuotes";
import type { PurchaseRequestLineResponse } from "@/lib/api/hooks/usePurchaseRequests";

function card(overrides: Partial<PurchaseQuoteCard> = {}): PurchaseQuoteCard {
  return {
    id: "q-1",
    request_id: "pr-1",
    supplier_id: "sup-1",
    supplier_name: "Demirsan A.Ş.",
    unit_price: "21500.00",
    delivery_time: "3 iş günü",
    warranty_note: "TS 708 standart",
    payment_terms: "days_30",
    shipping_included: true,
    shipping_cost: null,
    is_selected: false,
    created_at: "2026-08-11T10:00:00Z",
    total_cost: "322500.00",
    is_best_price: true,
    ...overrides,
  };
}

function line(overrides: Partial<PurchaseRequestLineResponse> = {}): PurchaseRequestLineResponse {
  return {
    id: "prl-1",
    sort_order: 0,
    stock_item_id: "it-1",
    stock_item_code: "DMR-12",
    free_text_name: null,
    free_text_unit: null,
    name: "Nervürlü Demir Ø12",
    unit: "Ton",
    quantity: "15.000",
    estimated_unit_price: "21900.00",
    line_total: "328500.00",
    current_stock: "2.000",
    ...overrides,
  };
}

describe("bestPriceQuotes — rozet SUNUCU damgasıdır", () => {
  it("yalnız sunucunun işaretlediği kartları döndürür", () => {
    const items = [
      card({ id: "a", is_best_price: false, total_cost: "100.00" }),
      card({ id: "b", is_best_price: true, total_cost: "900.00" }),
    ];
    // Toplamı DÜŞÜK olan kart bile sunucu damgalamadıysa rozet ALMAZ:
    // istemci burada hiçbir şey yeniden hesaplamaz.
    expect(bestPriceQuotes(items).map((item) => item.id)).toEqual(["b"]);
  });

  it("beraberlikte sunucunun rozetlediği HER kart korunur", () => {
    const items = [
      card({ id: "a", is_best_price: true }),
      card({ id: "b", is_best_price: true }),
    ];
    expect(bestPriceQuotes(items)).toHaveLength(2);
    expect(buildQuoteComparison(items, "328500.00").isBestPriceTied).toBe(true);
  });

  it("nakliyesi hariç UCUZ GÖRÜNEN teklif damgasız kalırsa öne çıkarılmaz", () => {
    const items = [
      // Birim fiyatı düşük ama nakliye hariç → sunucu rozetlemedi.
      card({
        id: "ucuz-gorunen",
        unit_price: "20000.00",
        shipping_included: false,
        shipping_cost: "80000.00",
        total_cost: "380000.00",
        is_best_price: false,
      }),
      card({ id: "gercek-en-iyi", total_cost: "322500.00", is_best_price: true }),
    ];
    expect(buildQuoteComparison(items, null).lowest?.id).toBe("gercek-en-iyi");
  });
});

describe("buildQuoteComparison — TEK 119-127 özeti", () => {
  const items = [
    card({ id: "a", supplier_name: "Demirsan A.Ş.", total_cost: "322500.00", is_best_price: true }),
    card({ id: "b", supplier_name: "Çelik Metalurji Ltd.", total_cost: "343500.00", is_best_price: false }),
    card({ id: "c", supplier_name: "Anadolu Demir Çelik", total_cost: "352500.00", is_best_price: false }),
  ];

  it("en düşük/en yüksek ve bütçe farkını mockup değerleriyle üretir", () => {
    const comparison = buildQuoteComparison(items, "328500.00");
    expect(comparison.lowest?.supplier_name).toBe("Demirsan A.Ş."); // 122
    expect(comparison.highest?.supplier_name).toBe("Anadolu Demir Çelik"); // 123
    expect(comparison.differenceToBudget).toBe(-6000); // 125
    expect(comparison.isBestPriceTied).toBe(false);
  });

  it("bütçe yoksa fark İDDİA EDİLMEZ", () => {
    expect(buildQuoteComparison(items, null).differenceToBudget).toBeNull();
  });

  it("teklif yoksa hiçbir metrik uydurulmaz", () => {
    const comparison = buildQuoteComparison([], "328500.00");
    expect(comparison.lowest).toBeNull();
    expect(comparison.highest).toBeNull();
    expect(comparison.differenceToBudget).toBeNull();
  });

  it("sunucu hiç rozet vermediyse 'en düşük' uydurulmaz", () => {
    const unstamped = items.map((item) => ({ ...item, is_best_price: false }));
    expect(buildQuoteComparison(unstamped, "328500.00").lowest).toBeNull();
  });
});

describe("talep özeti şeridi türevleri (TEK 45-46)", () => {
  it("tek kalemde kalemin adı, çok kalemde kalem sayısı basılır", () => {
    expect(requestMaterialLabel([line()])).toBe("Nervürlü Demir Ø12");
    expect(requestMaterialLabel([line(), line({ id: "prl-2" })])).toBe("2 kalem");
    expect(requestMaterialLabel([])).toBeNull();
  });

  it("birim yalnız TÜM kalemler aynı birimdeyse basılır", () => {
    expect(requestQuantityUnit([line(), line({ id: "prl-2", unit: "Ton" })])).toBe("Ton");
    expect(requestQuantityUnit([line(), line({ id: "prl-2", unit: "m" })])).toBeNull();
    expect(requestQuantityUnit([line({ unit: null })])).toBeNull();
    expect(requestQuantityUnit([])).toBeNull();
  });
});
