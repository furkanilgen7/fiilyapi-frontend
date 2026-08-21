import { describe, expect, it } from "vitest";

import {
  assignSelected,
  assignUnit,
  clearUnitSelection,
  effectiveAllocation,
  emptyAllocationState,
  selectAllUnits,
  setUnitShareholder,
  toggleUnitSelection,
  type AllocationState,
  type LandShareUnitRow,
} from "./allocation-state";

function unitRow(overrides: Partial<LandShareUnitRow> = {}): LandShareUnitRow {
  return {
    unit_id: "u-1",
    block_id: "blk-a",
    block_name: "A",
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

/** PG 131-237 — atanmamış · bizim · arsa üçlüsü. */
const ROWS: readonly LandShareUnitRow[] = [
  unitRow({ unit_id: "u-1", unit_no: "A-9" }), // PG 131 — Atanmadı
  unitRow({ unit_id: "u-2", unit_no: "A-1", owner_side: "contractor" }), // PG 178
  unitRow({
    unit_id: "u-3",
    unit_no: "A-2",
    owner_side: "landowner",
    shareholder_id: "sh-1",
    shareholder_name: "Ahmet Yılmaz",
  }), // PG 208
];

describe("effectiveAllocation — sunucu satırı + bekleyen katman", () => {
  it("bekleyen atama yoksa SUNUCUNUN değeri görünür", () => {
    expect(effectiveAllocation(ROWS[2], emptyAllocationState())).toEqual({
      ownerSide: "landowner",
      shareholderId: "sh-1",
    });
  });

  it("bekleyen atama sunucu değerini EZER", () => {
    const state = assignUnit(emptyAllocationState(), ROWS[1], "landowner");
    expect(effectiveAllocation(ROWS[1], state).ownerSide).toBe("landowner");
  });
});

describe("Seçim işlemleri", () => {
  it("tek satır seçilir ve yeniden tıklanınca seçim kalkar", () => {
    const once = toggleUnitSelection(emptyAllocationState(), "u-1");
    expect([...once.selected]).toEqual(["u-1"]);
    expect([...toggleUnitSelection(once, "u-1").selected]).toEqual([]);
  });

  it("PG 109 'Tümünü Seç' listedeki her satırı seçer", () => {
    const all = selectAllUnits(emptyAllocationState(), ROWS);
    expect([...all.selected].sort()).toEqual(["u-1", "u-2", "u-3"]);
  });

  it("seçim temizlenir ama BEKLEYEN atamalar korunur", () => {
    const assigned = assignUnit(selectAllUnits(emptyAllocationState(), ROWS), ROWS[0], "contractor");
    const cleared = clearUnitSelection(assigned);
    expect([...cleared.selected]).toEqual([]);
    expect(cleared.pending.size).toBe(1);
  });
});

describe("assignSelected — PG 92/93 toplu atama", () => {
  it("yalnız SEÇİLİ satırları atar", () => {
    const selected = toggleUnitSelection(emptyAllocationState(), "u-1");
    const after = assignSelected(selected, ROWS, "landowner");
    expect(after.pending.get("u-1")?.ownerSide).toBe("landowner");
    expect(after.pending.has("u-2")).toBe(false);
  });

  it("hiçbir şey seçili değilse hiçbir şey atanmaz", () => {
    expect(assignSelected(emptyAllocationState(), ROWS, "contractor").pending.size).toBe(0);
  });
});

describe("🔴 GUARD 10: `contractor` ataması HİSSEDARI TEMİZLER", () => {
  it("arsa satırı bize alınınca hissedar bekleyen durumda NULL olur", () => {
    // Sunucu kuralı: `shareholder_id` YALNIZ `owner_side=landowner` iken
    // anlamlıdır — aksi hâlde 422. Uç ATOMİKTİR: tek satır reddedilirse
    // hiçbiri yazılmaz, yani bu kusur TÜM kaydı düşürürdü.
    const state = assignUnit(emptyAllocationState(), ROWS[2], "contractor");
    expect(state.pending.get("u-3")).toEqual({ ownerSide: "contractor", shareholderId: null });
  });

  it("'Atanmadı' (null) da hissedarı temizler", () => {
    const state = assignUnit(emptyAllocationState(), ROWS[2], null);
    expect(state.pending.get("u-3")).toEqual({ ownerSide: null, shareholderId: null });
  });

  it("toplu atamada da temizlenir", () => {
    const selected = selectAllUnits(emptyAllocationState(), ROWS);
    const after = assignSelected(selected, ROWS, "contractor");
    expect(after.pending.get("u-3")?.shareholderId).toBeNull();
  });

  it("landowner ataması mevcut hissedarı KORUR", () => {
    const state = assignUnit(emptyAllocationState(), ROWS[2], "landowner");
    expect(state.pending.get("u-3")).toEqual({ ownerSide: "landowner", shareholderId: "sh-1" });
  });
});

describe("setUnitShareholder — PG 221 yalnız ARSA satırında", () => {
  it("arsa satırında hissedar atanır", () => {
    const state = setUnitShareholder(emptyAllocationState(), ROWS[2], "sh-2");
    expect(state.pending.get("u-3")).toEqual({ ownerSide: "landowner", shareholderId: "sh-2" });
  });

  it("bekleyen `landowner` ataması da hissedarı kabul eder", () => {
    const assigned = assignUnit(emptyAllocationState(), ROWS[0], "landowner");
    const state = setUnitShareholder(assigned, ROWS[0], "sh-3");
    expect(state.pending.get("u-1")?.shareholderId).toBe("sh-3");
  });

  it("🔴 BİZ satırında hissedar atanamaz — durum DEĞİŞMEZ (sunucu 422'si önlenir)", () => {
    const before = emptyAllocationState();
    expect(setUnitShareholder(before, ROWS[1], "sh-2")).toBe(before);
  });

  it("hissedar seçimi kaldırılabilir (null)", () => {
    const state = setUnitShareholder(emptyAllocationState(), ROWS[2], null);
    expect(state.pending.get("u-3")).toEqual({ ownerSide: "landowner", shareholderId: null });
  });
});

describe("🔴 GUARD 11: hiçbir işlem GİRDİYİ MUTASYONA UĞRATMAZ", () => {
  it("satır dizisi ve satır nesneleri değişmez", () => {
    const rows = ROWS.map((row) => ({ ...row }));
    const snapshot = JSON.parse(JSON.stringify(rows));
    let state: AllocationState = emptyAllocationState();

    state = selectAllUnits(state, rows);
    state = assignSelected(state, rows, "landowner");
    state = setUnitShareholder(state, rows[0], "sh-9");
    state = assignUnit(state, rows[1], "contractor");
    state = toggleUnitSelection(state, "u-2");
    state = clearUnitSelection(state);

    expect(state.pending.size).toBe(3);
    expect(rows).toEqual(snapshot);
  });

  it("girdi durumunun `pending` ve `selected` koleksiyonları değişmez", () => {
    const before = selectAllUnits(emptyAllocationState(), ROWS);
    const pendingSizeBefore = before.pending.size;
    const selectedSizeBefore = before.selected.size;

    assignSelected(before, ROWS, "contractor");
    toggleUnitSelection(before, "u-1");
    assignUnit(before, ROWS[0], "landowner");
    clearUnitSelection(before);

    expect(before.pending.size).toBe(pendingSizeBefore);
    expect(before.selected.size).toBe(selectedSizeBefore);
    expect([...before.selected].sort()).toEqual(["u-1", "u-2", "u-3"]);
  });

  it("her işlem YENİ bir durum nesnesi döner", () => {
    const before = emptyAllocationState();
    expect(toggleUnitSelection(before, "u-1")).not.toBe(before);
    expect(assignUnit(before, ROWS[0], "contractor")).not.toBe(before);
  });
});
