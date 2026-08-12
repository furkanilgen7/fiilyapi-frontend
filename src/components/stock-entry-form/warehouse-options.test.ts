import { describe, it, expect } from "vitest";

import type { WarehouseResponse } from "@/lib/api/hooks/useWarehouses";

import { defaultWarehouseId, groupWarehouses } from "./warehouse-options";

function warehouse(id: string, name: string, siteId: string | null): WarehouseResponse {
  return { id, name, site_id: siteId, created_at: "2025-03-01T08:00:00Z" };
}

const ROWS: WarehouseResponse[] = [
  warehouse("wh-0", "Merkez Depo (Sincan)", null),
  warehouse("wh-1", "D-1 Ambar", "s-1"),
  warehouse("wh-2", "D-2 Açık Alan", "s-1"),
  warehouse("wh-3", "D-3 Kapalı", "s-2"),
];

describe("groupWarehouses", () => {
  it("rotadaki şantiye / merkez / diğer olarak üçe ayırır", () => {
    const groups = groupWarehouses(ROWS, "s-1");

    expect(groups.site.map((w) => w.id)).toEqual(["wh-1", "wh-2"]);
    expect(groups.central.map((w) => w.id)).toEqual(["wh-0"]);
    expect(groups.other.map((w) => w.id)).toEqual(["wh-3"]);
  });
});

describe("defaultWarehouseId — ROTADAN ön doldurma (T3 sözleşmesi)", () => {
  it("şantiyenin İLK deposunu seçer", () => {
    expect(defaultWarehouseId(ROWS, "s-1")).toBe("wh-1");
  });

  it("şantiyenin deposu yoksa merkez depoyu SESSİZCE seçmez", () => {
    expect(defaultWarehouseId(ROWS, "s-9")).toBeNull();
  });
});
