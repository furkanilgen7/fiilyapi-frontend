import { describe, expect, it } from "vitest";

import {
  BULK_MAX_UNITS_MESSAGE,
  BULK_RANGE_INVALID_MESSAGE,
  BULK_UNITS_PER_FLOOR_MESSAGE,
} from "./constants";
import { deriveBulkTotal, type BulkRangeInput } from "./derive";

function input(overrides: Partial<BulkRangeInput> = {}): BulkRangeInput {
  return { startFloor: 1, endFloor: 8, roofFloor: false, unitsPerFloor: 3, ...overrides };
}

describe("deriveBulkTotal — 🔴 GUARD 1: sunucu formülüyle BİREBİR", () => {
  it("TU'nun kendi bloğu: 1..8 kat × 3 daire = 24 ünite", () => {
    // TU 73 kutusu "24 ünite" yazar ve TU 146 "24 ünite oluşturulacak" der.
    // Beklenen sayı ELLE yazıldı: formülün kendisiyle hesaplanmış bir beklenti
    // hiçbir şeyi bekçilemezdi.
    const result = deriveBulkTotal(input());
    expect(result.kind).toBe("valid");
    if (result.kind !== "valid") return;
    expect(result.rounds).toBe(8);
    expect(result.total).toBe(24);
    expect(result.text).toBe("24 ünite");
  });

  it("tek kat, tek daire = 1 ünite (alt sınır)", () => {
    const result = deriveBulkTotal(input({ startFloor: 1, endFloor: 1, unitsPerFloor: 1 }));
    expect(result.kind).toBe("valid");
    if (result.kind !== "valid") return;
    expect(result.rounds).toBe(1);
    expect(result.total).toBe(1);
    expect(result.text).toBe("1 ünite");
  });

  it("çatı katı TAM BİR tur ekler: 1..8 + çatı × 3 = 27", () => {
    const result = deriveBulkTotal(input({ roofFloor: true }));
    expect(result.kind).toBe("valid");
    if (result.kind !== "valid") return;
    expect(result.rounds).toBe(9);
    expect(result.total).toBe(27);
  });

  it("negatif kat MEŞRUDUR (ge=-5): -2..0 × 2 = 6", () => {
    const result = deriveBulkTotal(input({ startFloor: -2, endFloor: 0, unitsPerFloor: 2 }));
    expect(result.kind).toBe("valid");
    if (result.kind !== "valid") return;
    expect(result.rounds).toBe(3);
    expect(result.total).toBe(6);
  });

  it("bitiş katı başlangıçtan küçükse GEÇERSİZ — mesaj SUNUCUNUNKİDİR", () => {
    const result = deriveBulkTotal(input({ startFloor: 5, endFloor: 4 }));
    expect(result.kind).toBe("invalid_range");
    if (result.kind !== "invalid_range") return;
    expect(result.message).toBe(BULK_RANGE_INVALID_MESSAGE);
  });

  it("kat başına daire 0 GEÇERSİZDİR (sunucuda ge=1)", () => {
    const result = deriveBulkTotal(input({ unitsPerFloor: 0 }));
    expect(result.kind).toBe("invalid_units_per_floor");
    if (result.kind !== "invalid_units_per_floor") return;
    expect(result.message).toBe(BULK_UNITS_PER_FLOOR_MESSAGE);
  });

  it("kat başına daire 21 GEÇERSİZDİR (sunucuda le=20)", () => {
    expect(deriveBulkTotal(input({ unitsPerFloor: 21 })).kind).toBe("invalid_units_per_floor");
    expect(deriveBulkTotal(input({ unitsPerFloor: 20 })).kind).toBe("valid");
  });

  it("500 sınırı: 25 tur × 20 daire = 500 GEÇER, 26 tur × 20 = 520 GEÇMEZ", () => {
    const atLimit = deriveBulkTotal(input({ startFloor: 1, endFloor: 25, unitsPerFloor: 20 }));
    expect(atLimit.kind).toBe("valid");
    if (atLimit.kind === "valid") expect(atLimit.total).toBe(500);

    const overLimit = deriveBulkTotal(input({ startFloor: 1, endFloor: 26, unitsPerFloor: 20 }));
    expect(overLimit.kind).toBe("over_limit");
    if (overLimit.kind !== "over_limit") return;
    expect(overLimit.total).toBe(520);
    expect(overLimit.message).toBe(BULK_MAX_UNITS_MESSAGE);
  });

  it("🔴 ÇATI TURU 500 SINIRINA DAHİLDİR — sunucu yorumu bunu açıkça söyler", () => {
    // 1..25 × 20 = 500 tam sınırdadır. Çatı turu SAYILMASAYDI bu bileşim
    // geçerli görünür, sunucu ise 520 sayıp reddederdi.
    const withRoof = deriveBulkTotal(
      input({ startFloor: 1, endFloor: 25, roofFloor: true, unitsPerFloor: 20 }),
    );
    expect(withRoof.kind).toBe("over_limit");
    if (withRoof.kind !== "over_limit") return;
    expect(withRoof.rounds).toBe(26);
    expect(withRoof.total).toBe(520);
  });

  it("girdi eksikken sayı UYDURULMAZ — kutu '—' basar", () => {
    expect(deriveBulkTotal(input({ startFloor: null })).kind).toBe("incomplete");
    expect(deriveBulkTotal(input({ endFloor: null })).kind).toBe("incomplete");
    expect(deriveBulkTotal(input({ unitsPerFloor: null })).kind).toBe("incomplete");
    expect(deriveBulkTotal(input({ startFloor: null })).text).toBe("—");
  });

  it("0 kat (Zemin) EKSİK DEĞİLDİR — 0 ile null karıştırılmaz", () => {
    const result = deriveBulkTotal(input({ startFloor: 0, endFloor: 0, unitsPerFloor: 4 }));
    expect(result.kind).toBe("valid");
    if (result.kind !== "valid") return;
    expect(result.total).toBe(4);
  });
});
