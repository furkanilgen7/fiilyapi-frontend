import { describe, expect, it } from "vitest";

import type { SiteDiaryEntryDetail } from "@/lib/api/hooks/useSiteDiary";

import { detailWorkerSummary, isPaymentHidden } from "./cards-derive";

// DET-1.3 · İşçi dağılımı (İ:344-372, S7 "günün tümü (şantiye)") + S10 finans gizleme.

type WorkerEntry = Pick<SiteDiaryEntryDetail, "worker_counts" | "own_crew_from_timesheet">;

const ENTRY: WorkerEntry = {
  own_crew_from_timesheet: [
    { trade: "Kalıpçı", source: "company", headcount: 8, hours: "74.00" },
    { trade: "Formen", source: "company", headcount: 1, hours: "9.00" },
  ],
  worker_counts: [
    { id: "w1", trade: "Kaya Duvar", source: "subcontractor", count: 7, hours: "8.0", subcontractor_id: "s1", subcontractor_name: "Kaya Duvar Ltd." },
    { id: "w2", trade: "Deniz", source: "subcontractor", count: 5, hours: null, subcontractor_id: "s2", subcontractor_name: null },
    { id: "w3", trade: "Yardımcı", source: "general", count: 2, hours: null, subcontractor_id: null, subcontractor_name: null },
    { id: "w4", trade: "Boş eski", source: "company", count: 0, hours: null, subcontractor_id: null, subcontractor_name: null },
  ],
};

describe("detailWorkerSummary — salt okunur işçi dağılımı", () => {
  it("sıra: kendi ekip (puantajdan) → firma satırları → sayısı > 0 eski kayıt satırları", () => {
    const summary = detailWorkerSummary(ENTRY);

    expect(summary.rows.map((row) => row.name)).toEqual([
      "Kalıpçı",
      "Formen",
      "Kaya Duvar Ltd.",
      "Deniz",
      "Diğer (eski kayıt) · Yardımcı",
    ]);
  });

  it("kendi ekipte saat = a-s; firma a-s = kişi × saat; saatsiz firmada ve eski satırda a-s yok", () => {
    const summary = detailWorkerSummary(ENTRY);

    expect(summary.rows.map((row) => [row.count, row.hours, row.manHours])).toEqual([
      [8, "74.00", "74.00"],
      [1, "9.00", "9.00"],
      [7, "8.0", "56.0"],
      [5, null, null],
      [2, null, null],
    ]);
  });

  it("toplam: kişi Σ; a-s bilinenlerin Σ'ı; kendi/taşeron kırılımı (KPI 'İşçi')", () => {
    const summary = detailWorkerSummary(ENTRY);

    expect(summary.totalPeople).toBe(23);
    expect(summary.totalManHours).toBe("139.00");
    expect(summary.ownPeople).toBe(11);
    expect(summary.subcontractorPeople).toBe(12);
    expect(summary.hasFirmRows).toBe(true);
  });

  it("puantajsız ve satırsız gün: boş liste, sıfır toplam", () => {
    const summary = detailWorkerSummary({ own_crew_from_timesheet: undefined, worker_counts: [] });

    expect(summary.rows).toEqual([]);
    expect(summary.totalPeople).toBe(0);
    expect(summary.totalManHours).toBe("0");
    expect(summary.hasFirmRows).toBe(false);
  });
});

describe("isPaymentHidden — S10 Hakediş ₺ gizleme", () => {
  it("hakediş görüntüleme izni yoksa ('none') GİZLİ", () => {
    expect(isPaymentHidden({ canViewPayments: false, linesTotal: "197765.00" })).toBe(true);
  });

  it("tutar maskeli gelirse (null) GİZLİ — sıfır sayılmaz", () => {
    expect(isPaymentHidden({ canViewPayments: true, linesTotal: null })).toBe(true);
  });

  it("izin var + tutar geldi (sıfır dahil) → görünür", () => {
    expect(isPaymentHidden({ canViewPayments: true, linesTotal: "0.00" })).toBe(false);
  });
});
