import { describe, expect, it } from "vitest";

import { nextWeekSearch, parseWeekParam, WEEK_PARAM } from "./qurr-url";

describe("parseWeekParam", () => {
  it("geçerli tam sayı → o hafta", () => {
    expect(parseWeekParam("21")).toBe(21);
  });

  it("yok/geçersiz/negatif/sıfır → null (backend bugünün haftasına düşer)", () => {
    expect(parseWeekParam(null)).toBeNull();
    expect(parseWeekParam("bozuk")).toBeNull();
    expect(parseWeekParam("-1")).toBeNull();
    expect(parseWeekParam("0")).toBeNull();
    expect(parseWeekParam("21.5")).toBeNull();
  });
});

describe("nextWeekSearch", () => {
  it("hafta yazar, diğer parametreleri korur", () => {
    const current = new URLSearchParams("site=abc");
    const next = nextWeekSearch(current, 22);
    expect(next.get(WEEK_PARAM)).toBe("22");
    expect(next.get("site")).toBe("abc");
  });

  it("null → parametreyi siler", () => {
    const current = new URLSearchParams("hafta=22&site=abc");
    const next = nextWeekSearch(current, null);
    expect(next.has(WEEK_PARAM)).toBe(false);
    expect(next.get("site")).toBe("abc");
  });
});
