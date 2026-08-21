import { describe, expect, it } from "vitest";

import type { UnitListResponse } from "@/lib/api/hooks/useProjectUnits";

import type { LandShareUnitRow } from "./allocation-state";
import { applySavedAllocation, savedAllocationFromResponse } from "./saved-rows";

function unitRow(overrides: Partial<LandShareUnitRow> = {}): LandShareUnitRow {
  return {
    unit_id: "u-1",
    block_id: "blk-a",
    block_name: "A Blok",
    unit_no: "A-9",
    unit_kind: "apartment",
    layout: "3+1",
    floor: "3",
    gross_area_m2: "148",
    appraisal_value: "1380000",
    owner_side: null,
    shareholder_id: null,
    shareholder_name: null,
    buyer_name: null,
    sales_status: "listed",
    ...overrides,
  };
}

/** `PATCH …/units/allocation` yanıtı — blok blok gruplu `UnitResponse`. */
function response(units: readonly { id: string; owner_side: "contractor" | "landowner" | null; shareholder_id: string | null; shareholder_name: string | null }[]): UnitListResponse {
  return {
    totals: {} as UnitListResponse["totals"],
    blocks: [
      {
        block: { id: "blk-a", name: "A Blok" } as UnitListResponse["blocks"][number]["block"],
        units: units.map(
          (unit) => ({ ...unit }) as unknown as UnitListResponse["blocks"][number]["units"][number],
        ),
      },
    ],
  };
}

describe("savedAllocationFromResponse — cevap tek eşlemeye indirgenir", () => {
  it("blok gruplarını düzleştirir ve YALNIZ paylaşımın üç alanını alır", () => {
    const saved = savedAllocationFromResponse(
      response([
        { id: "u-1", owner_side: "contractor", shareholder_id: null, shareholder_name: null },
        { id: "u-2", owner_side: "landowner", shareholder_id: "sh-1", shareholder_name: "Ahmet" },
      ]),
    );
    expect(saved.get("u-1")).toEqual({
      ownerSide: "contractor",
      shareholderId: null,
      shareholderName: null,
    });
    expect(saved.get("u-2")).toEqual({
      ownerSide: "landowner",
      shareholderId: "sh-1",
      shareholderName: "Ahmet",
    });
  });
});

describe("applySavedAllocation — ikinci GET yerine cevabın bindirilmesi", () => {
  it("sunucunun yazdığı paylaşım satıra biner", () => {
    const rows = [unitRow({ unit_id: "u-1" })];
    const next = applySavedAllocation(
      rows,
      savedAllocationFromResponse(
        response([
          { id: "u-1", owner_side: "landowner", shareholder_id: "sh-1", shareholder_name: "Ahmet" },
        ]),
      ),
    );
    expect(next[0].owner_side).toBe("landowner");
    expect(next[0].shareholder_id).toBe("sh-1");
    expect(next[0].shareholder_name).toBe("Ahmet");
  });

  it("🔴 `LandShareUnitRow`a ÖZGÜ alanlar KAYBOLMAZ", () => {
    // Cevap `UnitResponse` taşır; satırı tamamen değiştirmek `block_name`,
    // `appraisal_value` ve `buyer_name` gibi bu tabloya özgü alanları
    // sildirirdi.
    const rows = [unitRow({ unit_id: "u-1", buyer_name: "Mehmet" })];
    const next = applySavedAllocation(
      rows,
      savedAllocationFromResponse(
        response([
          { id: "u-1", owner_side: "contractor", shareholder_id: null, shareholder_name: null },
        ]),
      ),
    );
    expect(next[0].block_name).toBe("A Blok");
    expect(next[0].appraisal_value).toBe("1380000");
    expect(next[0].buyer_name).toBe("Mehmet");
  });

  it("eşlemede olmayan satır OLDUĞU GİBİ kalır", () => {
    const rows = [unitRow({ unit_id: "u-9", owner_side: "contractor" })];
    const next = applySavedAllocation(
      rows,
      savedAllocationFromResponse(
        response([
          { id: "u-1", owner_side: "landowner", shareholder_id: null, shareholder_name: null },
        ]),
      ),
    );
    expect(next[0]).toBe(rows[0]);
  });

  it("girdi dizisi ve satırları MUTASYONA UĞRAMAZ", () => {
    const rows = [unitRow({ unit_id: "u-1" })];
    const snapshot = { ...rows[0] };
    applySavedAllocation(
      rows,
      savedAllocationFromResponse(
        response([
          { id: "u-1", owner_side: "landowner", shareholder_id: "sh-1", shareholder_name: "A" },
        ]),
      ),
    );
    expect(rows[0]).toEqual(snapshot);
  });

  it("boş eşlemede aynı dizi döner (gereksiz yeniden çizim yok)", () => {
    const rows = [unitRow()];
    expect(applySavedAllocation(rows, new Map())).toBe(rows);
  });
});
