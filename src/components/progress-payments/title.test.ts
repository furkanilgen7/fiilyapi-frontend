import { describe, expect, it } from "vitest";

import { formatPaymentTitle } from "./title";

describe("formatPaymentTitle", () => {
  it("sira no + donem basar (brief ornegi: #5 — Mayıs 2026)", () => {
    expect(
      formatPaymentTitle({ sequence_no: 5, period_year: 2026, period_month: 5 }),
    ).toBe("#5 — Mayıs 2026");
  });
  it("period_year null iken yalniz #N basar", () => {
    expect(
      formatPaymentTitle({ sequence_no: 3, period_year: null, period_month: 6 }),
    ).toBe("#3");
  });
  it("period_month null iken yalniz #N basar", () => {
    expect(
      formatPaymentTitle({ sequence_no: 3, period_year: 2026, period_month: null }),
    ).toBe("#3");
  });
  it("ikisi de null iken yalniz #N basar", () => {
    expect(
      formatPaymentTitle({ sequence_no: 1, period_year: null, period_month: null }),
    ).toBe("#1");
  });
});
