import { describe, it, expect } from "vitest";

import { lineTotalPreview } from "./line-total";

describe("lineTotalPreview", () => {
  it("miktar × birim fiyat verir", () => {
    expect(lineTotalPreview("10", "25.5")).toBe(255);
  });

  it("girdilerden biri boşken `null` döner (sessiz `0` YAZILMAZ)", () => {
    expect(lineTotalPreview("", "25")).toBeNull();
    expect(lineTotalPreview("10", "  ")).toBeNull();
  });

  it("sayı olmayan girdide `null` döner", () => {
    expect(lineTotalPreview("abc", "25")).toBeNull();
  });

  // no 49 — `Number(q) * Number(p)` kayan-nokta çarpımı kullanıyordu;
  // `0.1 × 0.2` klasik ondalık hassasiyet kaybı örneğidir (kayan-noktada
  // 0.020000000000000004). Decimal-safe (string/BigInt tabanlı) çarpım TAM
  // 0.02 vermeli.
  it("no 49 · ondalık hassasiyet kaybı OLMAZ (0.1 × 0.2 TAM 0.02 verir)", () => {
    expect(lineTotalPreview("0.1", "0.2")).toBe(0.02);
  });

  it("no 49 · çok basamaklı ondalık girdilerde de TAM sonuç verir", () => {
    expect(lineTotalPreview("1.005", "1.005")).toBe(1.010025);
  });

  it("no 49 · negatif girdi (validate.ts izin verse de) doğru işaretle çarpar", () => {
    expect(lineTotalPreview("-2.5", "4")).toBe(-10);
  });
});
