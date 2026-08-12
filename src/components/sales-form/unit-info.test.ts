import { describe, it, expect } from "vitest";

import type { UnitResponse } from "@/lib/api/hooks/useProjectUnits";
import { deriveSaleProfit, deriveUnitCost, deriveUnitInfoBoxes } from "./unit-info";

type MetricPlaceholder = UnitResponse["unit_cost"];

function metric(value: string | null, available: boolean, pendingModule: string | null = null): MetricPlaceholder {
  return { available, value, pending_module: pendingModule } as MetricPlaceholder;
}

function unit(overrides: Partial<UnitResponse> = {}): UnitResponse {
  return {
    gross_area_m2: "178.00",
    net_area_m2: "152.00",
    list_price: "1480000.00",
    unit_price_per_m2: "8314.61",
    unit_cost: metric("980000.00", true),
    ...overrides,
  } as UnitResponse;
}

describe("deriveUnitInfoBoxes — ünite bilgi kutuları (59-62)", () => {
  it("brüt/net, liste fiyatı ve m² birim fiyatını sunucu değerlerinden biçimler", () => {
    const info = deriveUnitInfoBoxes(unit());
    expect(info.grossNet).toBe("178 / 152");
    expect(info.listPrice).toBe("1.480.000");
    expect(info.pricePerM2).toBe("8.314,61");
    expect(info.cost.available).toBe(true);
    expect(info.cost.text).toBe("980.000");
  });

  it("maliyet zarfı available:false ise text null + pendingModule taşır (istemci uydurmaz)", () => {
    const cost = deriveUnitCost(unit({ unit_cost: metric(null, false, "project_costs") }));
    expect(cost.available).toBe(false);
    expect(cost.text).toBeNull();
    expect(cost.rawValue).toBeNull();
    expect(cost.pendingModule).toBe("project_costs");
  });
});

describe("deriveSaleProfit — 'Bu Satıştan Kâr' (89-92)", () => {
  it("maliyet SUNUCUDAN, bedel kullanıcıdan: kâr = bedel − maliyet, marj = kâr/bedel", () => {
    const profit = deriveSaleProfit(1440000, deriveUnitCost(unit()));
    expect(profit.available).toBe(true);
    expect(profit.amountText).toBe("460.000"); // 1.440.000 − 980.000
    expect(profit.marginPct).toBe("31,94"); // 460000/1440000*100
    expect(profit.isLoss).toBe(false);
  });

  it("maliyet yoksa kâr '—' (available:false) — istemci maliyet HESAPLAMAZ", () => {
    const profit = deriveSaleProfit(1440000, deriveUnitCost(unit({ unit_cost: metric(null, false) })));
    expect(profit.available).toBe(false);
    expect(profit.amountText).toBeNull();
    expect(profit.marginPct).toBeNull();
  });

  it("bedel yoksa (null) kâr da hesaplanmaz", () => {
    const profit = deriveSaleProfit(null, deriveUnitCost(unit()));
    expect(profit.available).toBe(false);
  });

  it("bedel maliyetin altındaysa zarar işaretlenir (bilgi, engel değil)", () => {
    const profit = deriveSaleProfit(900000, deriveUnitCost(unit()));
    expect(profit.available).toBe(true);
    expect(profit.isLoss).toBe(true);
  });
});
