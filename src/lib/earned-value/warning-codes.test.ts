import { describe, it, expect } from "vitest";

import { WARNING_META, warningMeta } from "./warning-codes";

// PLN-F3.1 · Uyarı rozeti eşlemesi — mockup Planlama - Panel.dc.html:231-258.

describe("WARNING_META", () => {
  it("mockuptaki sekiz kodun tümünü kapsar", () => {
    expect(Object.keys(WARNING_META).sort()).toEqual(
      [
        "pf_out_of_band",
        "undistributed_hours",
        "qty_overrun",
        "missing_diary",
        "draft_diary",
        "empty_rate",
        "unrated_entry",
        "unknown_line",
      ].sort(),
    );
  });

  it("pf_out_of_band → PF/danger/daily-report", () => {
    expect(WARNING_META.pf_out_of_band).toEqual({ label: "PF", tone: "danger", destination: "daily-report" });
  });

  it("undistributed_hours → SAAT/warning/diary", () => {
    expect(WARNING_META.undistributed_hours).toEqual({ label: "SAAT", tone: "warning", destination: "diary" });
  });

  it("qty_overrun → MİKTAR/warning/budget", () => {
    expect(WARNING_META.qty_overrun).toEqual({ label: "MİKTAR", tone: "warning", destination: "budget" });
  });

  it("missing_diary ve draft_diary → GÜNLÜK/danger/diary", () => {
    expect(WARNING_META.missing_diary).toEqual({ label: "GÜNLÜK", tone: "danger", destination: "diary" });
    expect(WARNING_META.draft_diary).toEqual({ label: "GÜNLÜK", tone: "danger", destination: "diary" });
  });

  it("empty_rate → ORAN/neutral/budget", () => {
    expect(WARNING_META.empty_rate).toEqual({ label: "ORAN", tone: "neutral", destination: "budget" });
  });

  it("unrated_entry ve unknown_line → UYARI/neutral/null", () => {
    expect(WARNING_META.unrated_entry).toEqual({ label: "UYARI", tone: "neutral", destination: null });
    expect(WARNING_META.unknown_line).toEqual({ label: "UYARI", tone: "neutral", destination: null });
  });
});

describe("warningMeta", () => {
  it("bilinen kod → WARNING_META'daki aynı değer", () => {
    expect(warningMeta("pf_out_of_band")).toEqual(WARNING_META.pf_out_of_band);
  });

  it("bilinmeyen kod (backend'in yeni değeri) → UYARI/neutral/null, ÇÖKMEZ", () => {
    expect(warningMeta("future_code")).toEqual({ label: "UYARI", tone: "neutral", destination: null });
  });
});
