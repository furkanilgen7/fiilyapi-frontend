import { describe, expect, it } from "vitest";

import { emptyBlockFormValues, setBlockField } from "./form-state";

describe("emptyBlockFormValues — mockup'ta GÖRÜNEN seçenekler", () => {
  it("seçicilerin başlangıcı mockup'taki seçenektir (BE 80 · 82 · 86 · 101)", () => {
    const values = emptyBlockFormValues();
    expect(values.roofType).toBe("none"); // BE 80 ilk seçenek "Yok"
    expect(values.groundFloorUsage).toBe("commercial"); // BE 82 "Dükkan / Ticari"
    expect(values.parkingType).toBe("closed"); // BE 86 "Kapalı Otopark"
    expect(values.status).toBe("construction"); // BE 101 `selected` "İnşaat Halinde"
  });

  it("sayı/metin kutuları GERÇEKTEN boştur (mockup'taki değerler örnek veridir)", () => {
    const values = emptyBlockFormValues();
    expect(values.basementFloorCount).toBe("");
    expect(values.floorCount).toBe("");
    expect(values.unitsPerFloor).toBe("");
    expect(values.shopCount).toBe("");
    expect(values.name).toBe("");
    expect(values.code).toBe("");
  });

  it("her çağrı YENİ nesne döner (paylaşılan durum yok)", () => {
    expect(emptyBlockFormValues()).not.toBe(emptyBlockFormValues());
  });
});

describe("setBlockField — immutability canonu", () => {
  it("gelen nesneyi DEĞİŞTİRMEZ, yenisini döner", () => {
    const before = emptyBlockFormValues();
    const after = setBlockField(before, "name", "C Blok");
    expect(after).not.toBe(before);
    expect(after.name).toBe("C Blok");
    expect(before.name).toBe(""); // 🔴 kaynak nesne dokunulmamış olmalı
  });

  it("yalnız hedef alanı değiştirir", () => {
    const before = emptyBlockFormValues();
    const after = setBlockField(before, "floorCount", "8");
    expect(after.floorCount).toBe("8");
    expect(after.status).toBe(before.status);
    expect(after.roofType).toBe(before.roofType);
  });
});
