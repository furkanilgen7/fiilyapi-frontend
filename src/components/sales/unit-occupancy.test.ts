import { describe, it, expect } from "vitest";

import type { UnitResponse } from "@/lib/api/hooks/useProjectUnits";
import {
  blockKindSummary,
  blockOccupancyCounts,
  blockOccupancySummary,
  unitOccupancyTone,
} from "./unit-occupancy";

function unit(overrides: Partial<UnitResponse> = {}): UnitResponse {
  return {
    unit_no: "1",
    unit_kind: "apartment",
    sales_status: "listed",
    ...overrides,
  } as UnitResponse;
}

describe("unitOccupancyTone — SY 76/89/92 hücre renkleri", () => {
  it("tonu SUNUCUNUN sales_status damgası belirler", () => {
    expect(unitOccupancyTone("sold")).toBe("sold");
    expect(unitOccupancyTone("reserved")).toBe("reserved");
    expect(unitOccupancyTone("listed")).toBe("available");
    expect(unitOccupancyTone("closed")).toBe("closed");
  });

  it("damgası olmayan ünite BOŞ tonundadır (uydurma satış yok)", () => {
    expect(unitOccupancyTone(null)).toBe("available");
  });
});

describe("blockKindSummary — SY 74/104 blok başlığı", () => {
  it("tür kırılımını mockup sırasıyla birleştirir", () => {
    const units = [
      unit({ unit_kind: "apartment" }),
      unit({ unit_kind: "shop" }),
      unit({ unit_kind: "apartment" }),
    ];
    expect(blockKindSummary(units)).toBe("2 Daire + 1 Dükkan");
  });

  it("hiç ünitesi olmayan blokta boş dize döner", () => {
    expect(blockKindSummary([])).toBe("");
  });
});

describe("blockOccupancySummary — SY 101/137 blok altı özeti", () => {
  it("üç kırılımı mockup sırasıyla basar", () => {
    const units = [
      unit({ sales_status: "sold" }),
      unit({ sales_status: "sold" }),
      unit({ sales_status: "reserved" }),
      unit({ sales_status: "listed" }),
    ];
    const counts = blockOccupancyCounts(units);
    expect(counts).toEqual({ sold: 2, reserved: 1, available: 1, closed: 0 });
    expect(blockOccupancySummary(counts)).toBe("2 tapulu · 1 rezerve · 1 boş");
  });

  it("sıfır olan kırılım BASILMAZ", () => {
    const counts = blockOccupancyCounts([unit({ sales_status: "sold" })]);
    expect(blockOccupancySummary(counts)).toBe("1 tapulu");
  });
});
