import { describe, expect, it } from "vitest";

import {
  deriveFloorOptions,
  NO_BLOCK_FLOOR_HINT,
  UNKNOWN_FLOOR_COUNT_HINT,
  type BlockFloorSource,
} from "./floor-options";

function block(overrides: Partial<BlockFloorSource> = {}): BlockFloorSource {
  return {
    floor_count: null,
    basement_floor_count: null,
    roof_type: null,
    ...overrides,
  };
}

describe("deriveFloorOptions — UE 66 'Kat' listesi BLOKTAN TÜRER", () => {
  it("mockup'ın kendi bloğu: 2 bodrum · 8 kat · dubleks çatı", () => {
    // BE 78 · 79 · 80'in kaydettiği blok UE 66'da böyle görünür. Sıra
    // AŞAĞIDAN YUKARIYA: en derin bodrum → zemin → katlar → çatı.
    const { options } = deriveFloorOptions(
      block({ basement_floor_count: 2, floor_count: 8, roof_type: "duplex" }),
    );
    expect([...options]).toEqual([
      "2. Bodrum",
      "1. Bodrum",
      "Zemin",
      "1. Kat",
      "2. Kat",
      "3. Kat",
      "4. Kat",
      "5. Kat",
      "6. Kat",
      "7. Kat",
      "8. Kat",
      "Çatı Katı",
    ]);
  });

  it("bloğun OLMAYAN katı listeye GİRMEZ (3 katlı blokta '4. Kat' yok)", () => {
    const { options } = deriveFloorOptions(block({ floor_count: 3 }));
    expect([...options]).toEqual(["Zemin", "1. Kat", "2. Kat", "3. Kat"]);
    expect(options).not.toContain("4. Kat");
  });

  it("bodrumu olmayan blokta bodrum seçeneği YOKTUR", () => {
    const { options } = deriveFloorOptions(block({ basement_floor_count: 0, floor_count: 2 }));
    expect(options.some((option) => option.includes("Bodrum"))).toBe(false);
    expect(options[0]).toBe("Zemin");
  });

  it("'Zemin' HER ZAMAN vardır — her bloğun zemini olur", () => {
    expect(deriveFloorOptions(block()).options).toContain("Zemin");
    expect(deriveFloorOptions(block({ floor_count: 5 })).options).toContain("Zemin");
  });
});

describe("deriveFloorOptions — 'Çatı Katı' YALNIZ çatısı olan blokta", () => {
  it("roof_type 'duplex' ve 'terrace' çatı katını açar (BE 80)", () => {
    for (const roofType of ["duplex", "terrace"] as const) {
      const { options } = deriveFloorOptions(block({ floor_count: 2, roof_type: roofType }));
      expect(options, roofType).toContain("Çatı Katı");
    }
  });

  it("roof_type 'none' ya da belirtilmemişse çatı katı YOKTUR", () => {
    // BE 80 "Yok" GERÇEK bir enum değeridir; `null` ise "belirtilmedi"dir.
    // İkisinde de kullanıcıya olmayan bir kat teklif EDİLMEZ.
    expect(deriveFloorOptions(block({ floor_count: 2, roof_type: "none" })).options).not.toContain(
      "Çatı Katı",
    );
    expect(deriveFloorOptions(block({ floor_count: 2 })).options).not.toContain("Çatı Katı");
  });
});

describe("deriveFloorOptions — eksik veri UYDURULMAZ, GÖRÜNÜR gerekçe basılır", () => {
  it("blok seçilmemişken liste BOŞTUR ve gerekçe döner", () => {
    const result = deriveFloorOptions(null);
    expect([...result.options]).toEqual([]);
    expect(result.hint).toBe(NO_BLOCK_FLOOR_HINT);
  });

  it("bloğun kat sayısı YOKSA aralık uydurulmaz; indirgenmiş küme + gerekçe", () => {
    // 🔴 `floor_count` null iken "1..10" gibi bir aralık basmak, kullanıcıya
    // bloğun sahip OLMADIĞI katları teklif etmek olurdu.
    const result = deriveFloorOptions(block({ basement_floor_count: 1, roof_type: "terrace" }));
    expect([...result.options]).toEqual(["1. Bodrum", "Zemin", "Çatı Katı"]);
    expect(result.hint).toBe(UNKNOWN_FLOOR_COUNT_HINT);
  });

  it("kat sayısı 0 da 'bilinmiyor' değildir — numaralı kat yoktur, gerekçe de yok", () => {
    const result = deriveFloorOptions(block({ floor_count: 0 }));
    expect([...result.options]).toEqual(["Zemin"]);
    expect(result.hint).toBeNull();
  });

  it("liste tamsa gerekçe null'dır", () => {
    expect(deriveFloorOptions(block({ floor_count: 4 })).hint).toBeNull();
  });
});

describe("deriveFloorOptions — serbest METİN alanıdır (KARAR 4)", () => {
  it("seçenekler sayı değil METİNdir", () => {
    const { options } = deriveFloorOptions(block({ floor_count: 1 }));
    for (const option of options) expect(typeof option).toBe("string");
  });

  it("saklanan değer ile gösterilen etiket AYNIDIR (ayrı value/label yok)", () => {
    // `floor` sütunu `str`dir; seçenek etiketi doğrudan saklanır.
    const { options } = deriveFloorOptions(block({ floor_count: 2 }));
    expect(options).toContain("2. Kat");
  });
});
