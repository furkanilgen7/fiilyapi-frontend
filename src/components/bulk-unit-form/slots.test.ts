import { describe, expect, it } from "vitest";

import {
  emptySlot,
  hasFilledSlot,
  isSlotFilled,
  resizeSlots,
  setSlotField,
  type BulkSlotValues,
} from "./slots";

function filledSlot(sequence: number, gross: string): BulkSlotValues {
  return { ...emptySlot(sequence), grossAreaM2: gross };
}

describe("emptySlot", () => {
  it("sıra numarasını taşır, hiçbir hücresi dolu değildir", () => {
    const slot = emptySlot(3);
    expect(slot.sequence).toBe(3);
    expect(slot.grossAreaM2).toBe("");
    expect(slot.netAreaM2).toBe("");
    expect(slot.listPrice).toBe("");
    expect(slot.layout).toBe("");
    expect([...slot.touched]).toEqual([]);
  });
});

describe("resizeSlots — 🔴 GUARD 2: satır sayısı `units_per_floor` ile KİLİTLİ", () => {
  it("2 → 4 büyürken mevcut satırlar BİREBİR korunur, 3-4 boş eklenir", () => {
    const before = [filledSlot(1, "148"), filledSlot(2, "112")];
    const after = resizeSlots(before, 4);

    expect(after).toHaveLength(4);
    // Aynı NESNE geri döner: "korundu" iddiası kopyalamayla değil kimlikle
    // kanıtlanır.
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
    expect(after[2]).toEqual(emptySlot(3));
    expect(after[3]).toEqual(emptySlot(4));
  });

  it("4 → 2 küçülürken SON satırlar düşer, kalanlar korunur", () => {
    const before = [
      filledSlot(1, "148"),
      filledSlot(2, "112"),
      filledSlot(3, "96"),
      filledSlot(4, "80"),
    ];
    const after = resizeSlots(before, 2);

    expect(after).toHaveLength(2);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
  });

  it("sıra numaraları HER ZAMAN kesintisiz 1..N'dir", () => {
    // Sunucu kuralı: `max(sequence) <= units_per_floor` ve benzersizlik.
    expect(resizeSlots([], 5).map((slot) => slot.sequence)).toEqual([1, 2, 3, 4, 5]);
    expect(resizeSlots(resizeSlots([], 5), 2).map((slot) => slot.sequence)).toEqual([1, 2]);
  });

  it("sıra numarası bozuksa DÜZELTİLİR (benzersizlik sunucu kuralıdır)", () => {
    const bozuk = [{ ...emptySlot(7), grossAreaM2: "148" }, { ...emptySlot(7), netAreaM2: "96" }];
    const after = resizeSlots(bozuk, 2);
    expect(after.map((slot) => slot.sequence)).toEqual([1, 2]);
    expect(after[0].grossAreaM2).toBe("148");
    expect(after[1].netAreaM2).toBe("96");
  });

  it("🔴 girdi dizisini MUTASYONA UĞRATMAZ", () => {
    const before = [filledSlot(1, "148"), filledSlot(2, "112")];
    const snapshot = JSON.parse(
      JSON.stringify(before.map((slot) => ({ ...slot, touched: [...slot.touched] }))),
    );

    resizeSlots(before, 4);
    resizeSlots(before, 1);

    expect(before).toHaveLength(2);
    expect(before.map((slot) => ({ ...slot, touched: [...slot.touched] }))).toEqual(snapshot);
  });

  it("geçersiz/eksik daire sayısında satır ÜRETMEZ", () => {
    expect(resizeSlots([filledSlot(1, "148")], null)).toEqual([]);
    expect(resizeSlots([filledSlot(1, "148")], 0)).toEqual([]);
    expect(resizeSlots([filledSlot(1, "148")], -3)).toEqual([]);
  });
});

describe("setSlotField — dokunma kaydı + değişmezlik", () => {
  it("yalnız hedef satırı değiştirir ve alanı DOKUNULDU diye işaretler", () => {
    const before = resizeSlots([], 3);
    const after = setSlotField(before, 1, "facing", "west");

    expect(after[1].facing).toBe("west");
    expect([...after[1].touched]).toEqual(["facing"]);
    expect(after[0]).toBe(before[0]);
    expect(after[2]).toBe(before[2]);
    expect(before[1].facing).not.toBe("west");
    expect([...before[1].touched]).toEqual([]);
  });

  it("aynı satırda ikinci alana dokunmak ilkini SİLMEZ", () => {
    const slots = setSlotField(setSlotField(resizeSlots([], 2), 0, "facing", "north"), 0, "layout", "3+1");
    expect([...slots[0].touched].sort()).toEqual(["facing", "layout"]);
  });

  it("aralık dışı indeks durumu DEĞİŞTİRMEZ", () => {
    const before = resizeSlots([], 2);
    expect(setSlotField(before, 5, "layout", "3+1")).toBe(before);
  });
});

describe("isSlotFilled / hasFilledSlot — `slots` gövdeye NE ZAMAN girer", () => {
  it("bomboş satır DOLU değildir", () => {
    expect(isSlotFilled(emptySlot(1))).toBe(false);
    expect(hasFilledSlot(resizeSlots([], 3))).toBe(false);
  });

  it("sayısal hücrelerden biri doluysa satır DOLUDUR", () => {
    expect(isSlotFilled({ ...emptySlot(1), grossAreaM2: "148" })).toBe(true);
    expect(isSlotFilled({ ...emptySlot(1), netAreaM2: "128" })).toBe(true);
    expect(isSlotFilled({ ...emptySlot(1), listPrice: "1280000" })).toBe(true);
  });

  it("yalnız BOŞLUK yazmak satırı doldurmaz", () => {
    expect(isSlotFilled({ ...emptySlot(1), grossAreaM2: "   " })).toBe(false);
  });

  it("DOKUNULMUŞ seçici satırı doldurur (değeri hiç boş olmaz)", () => {
    const slots = setSlotField(resizeSlots([], 2), 1, "facing", "north");
    expect(isSlotFilled(slots[1])).toBe(true);
    expect(hasFilledSlot(slots)).toBe(true);
  });
});
