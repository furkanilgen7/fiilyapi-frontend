import { describe, expect, it } from "vitest";

import { deriveBlockEstimate } from "./estimate";
import { emptyBlockFormValues, type BlockFormValues } from "./form-state";

function values(overrides: Partial<BlockFormValues> = {}): BlockFormValues {
  return { ...emptyBlockFormValues(), ...overrides };
}

describe("deriveBlockEstimate — BE 88-93 'Tahmini Toplam Ünite'", () => {
  it("mockup'ın kendi sayılarını üretir: 8 kat × 3 daire + 2 dükkan = 26", () => {
    const estimate = deriveBlockEstimate(
      values({ basementFloorCount: "2", floorCount: "8", unitsPerFloor: "3", shopCount: "2" }),
    );
    expect(estimate.count).toBe(26); // BE 93
    expect(estimate.caption).toBe("8 kat × 3 daire + 2 dükkan"); // BE 91
  });

  it("bodrum kat sayısı FORMÜLE GİRMEZ — kanıt BE 91'in kendi cümlesidir", () => {
    const withBasement = deriveBlockEstimate(
      values({ basementFloorCount: "5", floorCount: "8", unitsPerFloor: "3", shopCount: "2" }),
    );
    const withoutBasement = deriveBlockEstimate(
      values({ floorCount: "8", unitsPerFloor: "3", shopCount: "2" }),
    );
    expect(withBasement.count).toBe(26);
    expect(withBasement).toEqual(withoutBasement);
  });

  it("YALNIZ bodrum doluysa üç girdi hâlâ boştur → null", () => {
    const estimate = deriveBlockEstimate(values({ basementFloorCount: "3" }));
    expect(estimate.count).toBeNull();
    expect(estimate.caption).toBeNull();
  });
});

describe("deriveBlockEstimate — sunucu paritesi (BlockResponse.estimated_unit_count)", () => {
  it("ÜÇ girdi de boşken null döner — '0' YAZILMAZ", () => {
    // Sunucunun bağlayıcı gerekçesi: "Uc girdi de bossa None doner — 0
    // 'hesaplandi ve sifir' der ve bu yanlis bilgidir." İstemci farklı
    // davranırsa kullanıcı formda bir sayı, kayıtlı blokta başka bir sayı görür.
    const estimate = deriveBlockEstimate(emptyBlockFormValues());
    expect(estimate.count).toBeNull();
    expect(estimate.caption).toBeNull();
  });

  it("BİRİ bile doluysa kalanlar 0 sayılarak hesaplanır", () => {
    expect(deriveBlockEstimate(values({ shopCount: "2" })).count).toBe(2);
    expect(deriveBlockEstimate(values({ floorCount: "8" })).count).toBe(0);
    expect(deriveBlockEstimate(values({ unitsPerFloor: "3" })).count).toBe(0);
  });

  it("anlamsız girdi BOŞ sayılır (NaN ekrana kaçmaz)", () => {
    expect(deriveBlockEstimate(values({ floorCount: "abc" })).count).toBeNull();
    expect(deriveBlockEstimate(values({ floorCount: "abc", shopCount: "2" })).count).toBe(2);
  });
});

describe("deriveBlockEstimate — alt yazı SABİT DEĞİLDİR (BE 91)", () => {
  it("alt yazı O ANKİ girdileri yeniden yazar", () => {
    const estimate = deriveBlockEstimate(
      values({ floorCount: "12", unitsPerFloor: "4", shopCount: "0" }),
    );
    expect(estimate.count).toBe(48);
    expect(estimate.caption).toBe("12 kat × 4 daire + 0 dükkan");
  });

  it("eksik girdiler alt yazıda 0 olarak görünür", () => {
    expect(deriveBlockEstimate(values({ shopCount: "2" })).caption).toBe(
      "0 kat × 0 daire + 2 dükkan",
    );
  });

  it("mockup'ın cümlesi KOPYALANMAZ: farklı girdi farklı alt yazı verir", () => {
    const a = deriveBlockEstimate(values({ floorCount: "8", unitsPerFloor: "3", shopCount: "2" }));
    const b = deriveBlockEstimate(values({ floorCount: "9", unitsPerFloor: "3", shopCount: "2" }));
    expect(a.caption).not.toBe(b.caption);
  });
});
