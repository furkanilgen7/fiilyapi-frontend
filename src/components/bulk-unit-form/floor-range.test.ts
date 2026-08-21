import { describe, expect, it } from "vitest";

import {
  GROUND_FLOOR_LABEL,
  ROOF_FLOOR_LABEL,
  UNKNOWN_FLOOR_COUNT_HINT,
  NO_BLOCK_FLOOR_HINT,
  type BlockFloorSource,
} from "@/components/unit-form/floor-options";

import {
  ROOF_FLOOR_SENTINEL,
  deriveFloorRange,
  numericFloorLabel,
  parseFloorValue,
  resolveEndFloor,
} from "./floor-range";

function block(overrides: Partial<BlockFloorSource> = {}): BlockFloorSource {
  return { floor_count: null, basement_floor_count: null, roof_type: null, ...overrides };
}

describe("numericFloorLabel — backend `floor_label()` ile BİREBİR", () => {
  it("0 'Zemin'dir", () => {
    expect(numericFloorLabel(0)).toBe("Zemin");
  });

  it("pozitif kat 'n. Kat'tır", () => {
    expect(numericFloorLabel(1)).toBe("1. Kat");
    expect(numericFloorLabel(8)).toBe("8. Kat");
  });

  it("negatif kat 'n. Bodrum'dur (işaret ETİKETE taşınmaz)", () => {
    expect(numericFloorLabel(-1)).toBe("1. Bodrum");
    expect(numericFloorLabel(-2)).toBe("2. Bodrum");
  });

  it("zemin ve çatı etiketleri unit-form'dan YENİDEN KULLANILIR", () => {
    expect(numericFloorLabel(0)).toBe(GROUND_FLOOR_LABEL);
  });
});

describe("deriveFloorRange — TU 70/71 listeleri BLOKTAN türer", () => {
  it("2 bodrum · 3 kat · teras çatı: başlangıç listesi TAMSAYIDIR, aşağıdan yukarı", () => {
    const range = deriveFloorRange(
      block({ basement_floor_count: 2, floor_count: 3, roof_type: "terrace" }),
    );
    expect(range.startOptions.map((option) => option.value)).toEqual([
      "-2",
      "-1",
      "0",
      "1",
      "2",
      "3",
    ]);
    expect(range.startOptions.map((option) => option.label)).toEqual([
      "2. Bodrum",
      "1. Bodrum",
      "Zemin",
      "1. Kat",
      "2. Kat",
      "3. Kat",
    ]);
  });

  it("BAŞLANGIÇ katı listesinde 'Çatı Katı' YOKTUR (yalnız bitiş katı sunar)", () => {
    const range = deriveFloorRange(block({ floor_count: 3, roof_type: "terrace" }));
    expect(range.startOptions.map((option) => option.value)).not.toContain(ROOF_FLOOR_SENTINEL);
    expect(range.endOptions[range.endOptions.length - 1]).toEqual({
      value: ROOF_FLOOR_SENTINEL,
      label: ROOF_FLOOR_LABEL,
    });
  });

  it("çatı tipi `none` ise 'Çatı Katı' seçeneği HİÇ açılmaz", () => {
    const range = deriveFloorRange(block({ floor_count: 3, roof_type: "none" }));
    expect(range.endOptions.map((option) => option.value)).toEqual(["0", "1", "2", "3"]);
  });

  it("en yüksek sayısal kat `topFloor` olarak bildirilir", () => {
    expect(deriveFloorRange(block({ floor_count: 8, roof_type: "duplex" })).topFloor).toBe(8);
    expect(deriveFloorRange(block({ floor_count: null })).topFloor).toBe(0);
  });

  it("blok seçilmemişken liste BOŞ + GÖRÜNÜR gerekçe", () => {
    const range = deriveFloorRange(null);
    expect(range.startOptions).toEqual([]);
    expect(range.endOptions).toEqual([]);
    expect(range.hint).toBe(NO_BLOCK_FLOOR_HINT);
    expect(range.topFloor).toBeNull();
  });

  it("kat sayısı GİRİLMEMİŞ blokta liste eksiktir ve bu SÖYLENİR", () => {
    expect(deriveFloorRange(block({ floor_count: null })).hint).toBe(UNKNOWN_FLOOR_COUNT_HINT);
    expect(deriveFloorRange(block({ floor_count: 0 })).hint).toBeNull();
  });
});

describe("resolveEndFloor — 🔴 sentinel `end_floor`a SIZAMAZ", () => {
  const range = deriveFloorRange(
    block({ basement_floor_count: 1, floor_count: 8, roof_type: "duplex" }),
  );

  it("'Çatı Katı' seçimi roof_floor=true + en yüksek SAYISAL kat demektir", () => {
    const resolved = resolveEndFloor(ROOF_FLOOR_SENTINEL, range);
    expect(resolved).toEqual({ endFloor: 8, roofFloor: true });
    expect(typeof resolved.endFloor).toBe("number");
  });

  it("sentinel metni endFloor'a HİÇBİR ŞEKİLDE geçmez", () => {
    const resolved = resolveEndFloor(ROOF_FLOOR_SENTINEL, range);
    expect(String(resolved.endFloor)).not.toBe(ROOF_FLOOR_SENTINEL);
    expect(Number.isNaN(Number(resolved.endFloor))).toBe(false);
  });

  it("sayısal seçim olduğu gibi geçer, roof_floor=false kalır", () => {
    expect(resolveEndFloor("2", range)).toEqual({ endFloor: 2, roofFloor: false });
    expect(resolveEndFloor("-1", range)).toEqual({ endFloor: -1, roofFloor: false });
  });

  it("'0' (Zemin) BOŞ değildir — 0 ile boş karıştırılmaz", () => {
    expect(resolveEndFloor("0", range)).toEqual({ endFloor: 0, roofFloor: false });
    expect(resolveEndFloor("", range)).toEqual({ endFloor: null, roofFloor: false });
  });

  it("blok seçilmemişken 'Çatı Katı' bir sayı UYDURMAZ", () => {
    expect(resolveEndFloor(ROOF_FLOOR_SENTINEL, deriveFloorRange(null))).toEqual({
      endFloor: null,
      roofFloor: true,
    });
  });
});

describe("parseFloorValue", () => {
  it("boş metin ve anlamsız metin `null` döner; 0 döner", () => {
    expect(parseFloorValue("")).toBeNull();
    expect(parseFloorValue("  ")).toBeNull();
    expect(parseFloorValue("abc")).toBeNull();
    expect(parseFloorValue("0")).toBe(0);
    expect(parseFloorValue("-5")).toBe(-5);
  });
});
