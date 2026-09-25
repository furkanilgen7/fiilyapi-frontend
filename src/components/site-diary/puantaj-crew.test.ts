import { describe, it, expect } from "vitest";

import type { TimesheetWeekRow } from "@/lib/api/hooks/useTimesheet";

import { normalizeTrade, puantajCellFor, puantajDayCrew } from "./puantaj-crew";

function person(trade: string, source: string, hours: string | null, day = "2026-09-24"): TimesheetWeekRow {
  return {
    personnel_id: `p-${trade}-${hours}`,
    full_name: "X",
    trade,
    source,
    subcontractor_name: null,
    cells: [{ work_date: day, hours, code: null, section_id: null }],
    totals: {},
  } as unknown as TimesheetWeekRow;
}

describe("puantajDayCrew", () => {
  it("günün saatlerini (kaynak, meslek) kırılımıyla toplar; saatsiz/sıfır kişi sayılmaz", () => {
    const crew = puantajDayCrew(
      [
        person("Kalıpçı", "company", "9.0"),
        person("Kalıpçı", "company", "11.0"),
        person("Kalıpçı", "company", "0"),
        person("Yardımcı", "general", null),
        person("Betoncu", "company", "8.5", "2026-09-23"),
      ],
      "2026-09-24",
    );

    expect(puantajCellFor(crew, { trade: "Kalıpçılar", source: "company" })).toEqual({ people: 2, hours: "20.0" });
    expect(puantajCellFor(crew, { trade: "Yardımcı", source: "general" })).toBeNull();
    expect(crew.totalPeople).toBe(2);
    expect(crew.totalHours).toBe("20.0");
  });

  it("kaynak farklıysa eşleşmez (Şirket kalıpçısı ≠ taşeron kalıpçısı)", () => {
    const crew = puantajDayCrew([person("Demirci", "company", "9")], "2026-09-24");

    expect(puantajCellFor(crew, { trade: "Demirciler", source: "subcontractor" })).toBeNull();
  });
});

describe("normalizeTrade", () => {
  it("TR küçük harf + çoğul eki", () => {
    expect(normalizeTrade(" Elektrikçiler ")).toBe("elektrikçi");
    expect(normalizeTrade("İŞÇİLER")).toBe("işçi");
  });
});
