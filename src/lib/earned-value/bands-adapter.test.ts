import { describe, it, expect } from "vitest";

import { bandsFromReport, bandsFromSettings, reportBand } from "./bands-adapter";
import { DEFAULT_PF_BANDS } from "./bands";
import type { EvPfBandsOut, EvSettingsRead } from "@/lib/api/models";

// PLN-F3.1 · settings.pf_bands (HER ZAMAN dolu) ↔ report.pf_bands (nullable
// high_above) ayrımı — bkz. F3-SOZLESME.md §2.

function settings(overrides: Partial<EvSettingsRead["pf_bands"]> = {}): EvSettingsRead {
  return {
    composite_metrics: [],
    holidays: [],
    is_default: false,
    pf_bands: {
      daily: { red_below: "0.90", green_from: "0.92", high_above: "1.10" },
      weekly: { red_below: "0.88", green_from: "0.99" },
      ...overrides,
    },
    standard_daily_hours: "9",
    tolerance_points: "2",
    updated_at: null,
    updated_by: null,
    week_start_dow: 1,
    weekly_off_days: [0],
  } as EvSettingsRead;
}

describe("bandsFromSettings", () => {
  it("settings.pf_bands alanlarını PfBandSettings'e taşır", () => {
    expect(bandsFromSettings(settings())).toEqual({
      daily: { redBelow: "0.90", greenFrom: "0.92", highAbove: "1.10" },
      weekly: { redBelow: "0.88", greenFrom: "0.99" },
    });
  });

  it("settings undefined → varsayılan bantlar", () => {
    expect(bandsFromSettings(undefined)).toEqual(DEFAULT_PF_BANDS);
  });
});

describe("bandsFromReport", () => {
  const report: EvPfBandsOut = {
    daily: { red_below: "0.95", green_from: "0.95", high_above: "1.05" },
    cumulative: { red_below: "0.90", green_from: "1.00" },
  } as EvPfBandsOut;

  it("cumulative → weekly, daily → daily (highAbove taşınır)", () => {
    expect(bandsFromReport(report)).toEqual({
      daily: { redBelow: "0.95", greenFrom: "0.95", highAbove: "1.05" },
      weekly: { redBelow: "0.90", greenFrom: "1.00" },
    });
  });

  it("daily.high_above null → highAbove null (\"high\" bandı üretilmez)", () => {
    const withoutHigh: EvPfBandsOut = {
      daily: { red_below: "0.95", green_from: "0.95", high_above: null },
      cumulative: { red_below: "0.90", green_from: "1.00" },
    } as EvPfBandsOut;
    expect(bandsFromReport(withoutHigh)?.daily.highAbove).toBeNull();
  });

  it.each([null, undefined])("bands %s → null", (value) => {
    expect(bandsFromReport(value)).toBeNull();
  });
});

describe("reportBand", () => {
  it.each(["red", "amber", "green", "high"] as const)("%s aynen geçer", (band) => {
    expect(reportBand(band)).toBe(band);
  });

  it.each([null, undefined])("%s → none", (value) => {
    expect(reportBand(value)).toBe("none");
  });
});
