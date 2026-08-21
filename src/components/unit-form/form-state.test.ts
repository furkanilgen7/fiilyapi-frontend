import { describe, expect, it } from "vitest";

import { emptyUnitFormValues, setUnitField } from "./form-state";

describe("emptyUnitFormValues — mockup'ta `selected` olan seçenekler", () => {
  it("seçicilerin başlangıcı mockup'taki seçimdir (UE 74 · 78 · 81 · 93 · 94 · 95)", () => {
    const values = emptyUnitFormValues();
    expect(values.unitKind).toBe("apartment"); // UE 74 "Daire"
    expect(values.facing).toBe("southwest"); // UE 78 "Güney-Batı"
    expect(values.parkingRight).toBe("one_closed"); // UE 81 "1 Araç (Kapalı)"
    expect(values.vatRate).toBe("10"); // UE 93 "%10"
    expect(values.salesStatus).toBe("listed"); // UE 94 "Satışta (Boş)"
    expect(values.ownerSide).toBe("contractor"); // UE 95 "Yüklenici (Biz)"
  });

  it("metin/sayı kutuları GERÇEKTEN boştur (mockup değerleri örnek veridir)", () => {
    const values = emptyUnitFormValues();
    expect(values.unitNo).toBe("");
    expect(values.floor).toBe("");
    expect(values.layout).toBe("");
    expect(values.grossAreaM2).toBe("");
    expect(values.listPrice).toBe("");
  });

  it("pending yüzeylerin (maliyet · kâr · belge) durumda karşılığı YOKTUR", () => {
    const stateKeys = Object.keys(emptyUnitFormValues());
    expect(stateKeys.filter((key) => /cost|profit|document|file/i.test(key))).toEqual([]);
  });

  it("her çağrı YENİ nesne döner (paylaşılan durum yok)", () => {
    expect(emptyUnitFormValues()).not.toBe(emptyUnitFormValues());
  });
});

describe("setUnitField — immutability canonu", () => {
  it("gelen nesneyi DEĞİŞTİRMEZ, yenisini döner", () => {
    const before = emptyUnitFormValues();
    const after = setUnitField(before, "unitNo", "B-12");
    expect(after).not.toBe(before);
    expect(after.unitNo).toBe("B-12");
    expect(before.unitNo).toBe(""); // 🔴 kaynak nesne dokunulmamış olmalı
  });

  it("yalnız hedef alanı değiştirir", () => {
    const before = emptyUnitFormValues();
    const after = setUnitField(before, "floor", "3. Kat");
    expect(after.floor).toBe("3. Kat");
    expect(after.facing).toBe(before.facing);
    expect(after.unitKind).toBe(before.unitKind);
  });
});
