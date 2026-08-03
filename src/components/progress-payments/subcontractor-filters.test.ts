import { describe, expect, it } from "vitest";

import {
  parseSubcontractorFilters,
  recentPeriods,
  withSubcontractorFilterParams,
} from "./subcontractor-filters";

describe("parseSubcontractorFilters", () => {
  it("bos URL'de her alan bos/null doner", () => {
    expect(parseSubcontractorFilters(new URLSearchParams())).toEqual({
      projectId: null,
      periodYear: null,
      periodMonth: null,
      status: null,
      q: "",
    });
  });

  it("dolu URL'i tipli alanlara ayristirir", () => {
    const params = new URLSearchParams(
      "project_id=11111111-1111-1111-1111-111111111111&period_year=2026&period_month=7&status=approved&q=Akin",
    );
    expect(parseSubcontractorFilters(params)).toEqual({
      projectId: "11111111-1111-1111-1111-111111111111",
      periodYear: 2026,
      periodMonth: 7,
      status: "approved",
      q: "Akin",
    });
  });

  it("gecersiz durum degeri (draft) sessizce null'a duser (filtre listesinde yok)", () => {
    const params = new URLSearchParams("status=draft");
    expect(parseSubcontractorFilters(params).status).toBeNull();
  });

  it("bilinmeyen durum degeri sessizce null'a duser", () => {
    const params = new URLSearchParams("status=bilinmeyen");
    expect(parseSubcontractorFilters(params).status).toBeNull();
  });

  it("sayisal olmayan/negatif donem alanlari null'a duser (0 UYDURULMAZ)", () => {
    expect(parseSubcontractorFilters(new URLSearchParams("period_year=abc")).periodYear).toBeNull();
    expect(parseSubcontractorFilters(new URLSearchParams("period_month=-1")).periodMonth).toBeNull();
    expect(parseSubcontractorFilters(new URLSearchParams("period_month=0")).periodMonth).toBeNull();
  });
});

describe("withSubcontractorFilterParams", () => {
  it("yeni alani ekler, mevcut nesneyi mutate etmez", () => {
    const current = new URLSearchParams("q=eski");
    const next = withSubcontractorFilterParams(current, { status: "paid" });
    expect(current.toString()).toBe("q=eski");
    expect(next.toString()).toBe("q=eski&status=paid");
  });

  it("null/bos deger alani siler", () => {
    const current = new URLSearchParams("status=paid&q=akin");
    const next = withSubcontractorFilterParams(current, { status: null, q: "" });
    expect(next.toString()).toBe("");
  });

  it("birden fazla alani ayni anda yamalar", () => {
    const current = new URLSearchParams();
    const next = withSubcontractorFilterParams(current, { period_year: 2026, period_month: 7 });
    expect(next.get("period_year")).toBe("2026");
    expect(next.get("period_month")).toBe("7");
  });
});

describe("recentPeriods", () => {
  it("referans aydan geriye dogru N ay uretir, yil sinirini asar", () => {
    const result = recentPeriods(new Date(2026, 0, 15), 3); // Ocak 2026 (ay index 0)
    expect(result).toEqual([
      { year: 2026, month: 1 },
      { year: 2025, month: 12 },
      { year: 2025, month: 11 },
    ]);
  });

  it("count kadar oge doner", () => {
    expect(recentPeriods(new Date(2026, 6, 1), 12)).toHaveLength(12);
  });
});
