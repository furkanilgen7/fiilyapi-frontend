import { describe, expect, it } from "vitest";

import {
  emptyBulkUnitFormValues,
  setBulkUnitField,
  setUnitsPerFloor,
} from "./form-state";

describe("emptyBulkUnitFormValues — mockup örnek verisi VARSAYILAN DEĞİLDİR", () => {
  it("örnek değerler (C Blok · 148 · 1.280.000) forma sızmaz", () => {
    const values = emptyBulkUnitFormValues();
    expect(values.blockId).toBe("");
    expect(values.startFloor).toBe("");
    expect(values.endFloor).toBe("");
    expect(values.unitsPerFloor).toBe("");
    expect(values.slots).toEqual([]);
  });

  it("seçicilerin başlangıcı mockup'ta GÖRÜNEN seçenektir", () => {
    const values = emptyBulkUnitFormValues();
    expect(values.unitKind).toBe("apartment"); // UNIT_KIND_OPTIONS ilk üye
    expect(values.numbering).toBe("block_sequence"); // TU 79 `selected`
  });

  it("TU 137 kutucuğu mockup'ta İŞARETLİDİR ama artış yüzdesi BOŞ başlar", () => {
    const values = emptyBulkUnitFormValues();
    expect(values.floorPriceIncreaseEnabled).toBe(true);
    expect(values.floorPriceIncreasePct).toBe("");
  });

  it("🔴 TU 104 MALİYETİN durumda KARŞILIĞI YOKTUR", () => {
    const keys = Object.keys(emptyBulkUnitFormValues());
    expect(keys.filter((key) => /cost|profit|margin|maliyet/i.test(key))).toEqual([]);
  });
});

describe("setBulkUnitField — değişmezlik", () => {
  it("yeni nesne üretir, girdiyi DEĞİŞTİRMEZ", () => {
    const before = emptyBulkUnitFormValues();
    const after = setBulkUnitField(before, "blockId", "blk-c");

    expect(after.blockId).toBe("blk-c");
    expect(before.blockId).toBe("");
    expect(after).not.toBe(before);
  });
});

describe("setUnitsPerFloor — 🔴 tablo satırları alanla KİLİTLİ hareket eder", () => {
  it("daire sayısı yazılınca kat şablonu O KADAR satıra eşitlenir", () => {
    const values = setUnitsPerFloor(emptyBulkUnitFormValues(), "3");
    expect(values.unitsPerFloor).toBe("3");
    expect(values.slots.map((slot) => slot.sequence)).toEqual([1, 2, 3]);
  });

  it("küçültmede dolu satırlar korunur, fazlası düşer", () => {
    const three = setUnitsPerFloor(emptyBulkUnitFormValues(), "3");
    const filled = {
      ...three,
      slots: three.slots.map((slot, index) =>
        index === 0 ? { ...slot, grossAreaM2: "148" } : slot,
      ),
    };
    const two = setUnitsPerFloor(filled, "2");
    expect(two.slots).toHaveLength(2);
    expect(two.slots[0].grossAreaM2).toBe("148");
  });

  it("alan silinince tablo BOŞALIR (0 satır = ortak varsayılanlar yolu)", () => {
    const three = setUnitsPerFloor(emptyBulkUnitFormValues(), "3");
    expect(setUnitsPerFloor(three, "").slots).toEqual([]);
  });

  it("girdiyi MUTASYONA UĞRATMAZ", () => {
    const before = emptyBulkUnitFormValues();
    setUnitsPerFloor(before, "4");
    expect(before.unitsPerFloor).toBe("");
    expect(before.slots).toEqual([]);
  });
});
