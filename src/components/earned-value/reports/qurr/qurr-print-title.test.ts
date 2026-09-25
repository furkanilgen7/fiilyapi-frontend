import { describe, expect, it } from "vitest";

import { joinNonEmpty } from "./qurr-print-title";

describe("joinNonEmpty", () => {
  it("hepsi doluysa ayraçla birleştirir", () => {
    expect(joinNonEmpty(["FİİL Yapı", "Güneşkent Konut", "A-Blok Şantiyesi"])).toBe(
      "FİİL Yapı · Güneşkent Konut · A-Blok Şantiyesi",
    );
  });

  it("boş parçaları atlar, ayraç üst üste binmez", () => {
    expect(joinNonEmpty(["FİİL Yapı", "", "A-Blok Şantiyesi"])).toBe("FİİL Yapı · A-Blok Şantiyesi");
  });

  it("hepsi boşsa boş dize döner", () => {
    expect(joinNonEmpty(["", "", ""])).toBe("");
  });

  it("özel ayraç verilebilir", () => {
    expect(joinNonEmpty(["a", "b"], " / ")).toBe("a / b");
  });
});
