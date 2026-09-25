import { describe, it, expect } from "vitest";

import type { OwnCrewFromTimesheet, SiteDiaryWorkerCountRead } from "@/lib/api/hooks/useSiteDiary";

import {
  areWorkerCountsDirty,
  buildDiaryWorkerRows,
  buildWorkerCountsBody,
  buildWorkerRows,
  diaryCrewTotals,
  firmManHours,
  invalidWorkerCountKeys,
  isLegacyRow,
  parseWorkerCount,
  workerCountKey,
  workerCountsFromEntry,
} from "./worker-counts";

// F-SD T6 → PLN-F2.1b · "Bugünkü İşçi Dağılımı" türevleri. Kendi ekip satırları
// artık backend'in `own_crew_from_timesheet`inden gelir (G12a); günlük işçi
// satırları yalnız FİRMA + "Diğer (eski kayıt)" satırlarıdır. Backend'in
// DEĞİŞTİRME semantiği (gönderilmeyen çift SİLİNİR) burada kanıtlanır.

function entryRow(overrides: Partial<SiteDiaryWorkerCountRead> = {}): SiteDiaryWorkerCountRead {
  return {
    id: "w-1",
    trade: "Kalıpçılar",
    source: "company",
    count: 12,
    // DET-1.B: firmasız satırda firma adı `null`.
    subcontractor_name: null,
    ...overrides,
  } satisfies SiteDiaryWorkerCountRead;
}

function firmRow(overrides: Partial<SiteDiaryWorkerCountRead> = {}): SiteDiaryWorkerCountRead {
  return entryRow({
    id: "w-f",
    trade: "Kaya Duvar",
    source: "subcontractor",
    count: 6,
    subcontractor_id: "firm-1",
    subcontractor_name: "Kaya Duvar",
    hours: "9.0",
    ...overrides,
  });
}

function crew(overrides: Partial<OwnCrewFromTimesheet> = {}): OwnCrewFromTimesheet {
  return { trade: "Kalıpçı", source: "company", headcount: 3, hours: "27.0", ...overrides };
}

describe("buildWorkerRows (G12a — hazır satır YOK)", () => {
  it("kayıt boşsa satır da YOKTUR (eski dört hazır satır kalktı)", () => {
    expect(buildWorkerRows([])).toEqual([]);
  });

  it("firmasız satır sayısı > 0 ise 'eski kayıt' satırı olarak kalır", () => {
    const rows = buildWorkerRows([entryRow({ trade: "Sıvacı", source: "subcontractor", count: 5 })]);

    expect(rows).toEqual([{ trade: "Sıvacı", source: "subcontractor" }]);
    expect(isLegacyRow(rows[0])).toBe(true);
  });

  it("firmasız satır sayısı 0 ise GÖSTERİLMEZ", () => {
    expect(buildWorkerRows([entryRow({ count: 0 })])).toEqual([]);
  });

  it("firma satırı sayısından bağımsız basılır ve FİRMA anahtarı taşır", () => {
    const rows = buildWorkerRows([firmRow({ count: 0 })]);

    expect(rows).toEqual([{ trade: "Kaya Duvar", source: "subcontractor", subcontractorId: "firm-1" }]);
    expect(workerCountKey(rows[0])).toBe("firm|firm-1");
    expect(isLegacyRow(rows[0])).toBe(false);
  });

  it("firma satırları önce, eski kayıt satırları sonra gelir", () => {
    const rows = buildWorkerRows([entryRow({ count: 4 }), firmRow()]);

    expect(rows.map(workerCountKey)).toEqual(["firm|firm-1", "company|Kalıpçılar"]);
  });

  it("aynı meslek FARKLI kaynakta ayrı satırdır (kimlik ikilidir)", () => {
    const rows = buildWorkerRows([
      entryRow({ trade: "Kalıpçılar", source: "company", count: 2 }),
      entryRow({ id: "w-2", trade: "Kalıpçılar", source: "subcontractor", count: 3 }),
    ]);

    expect(rows).toHaveLength(2);
  });
});

describe("buildDiaryWorkerRows", () => {
  it("eklenen firma sona girer, kaldırılan satır düşer", () => {
    const entryRows = [entryRow({ count: 4 }), firmRow()];
    const rows = buildDiaryWorkerRows(
      entryRows,
      [{ subcontractorId: "firm-2", trade: "Deniz Tesisat" }],
      ["company|Kalıpçılar"],
    );

    expect(rows.map(workerCountKey)).toEqual(["firm|firm-1", "firm|firm-2"]);
  });

  it("kayıtta olan firma yeniden eklenirse satır ÇİFTLENMEZ", () => {
    const rows = buildDiaryWorkerRows([firmRow()], [{ subcontractorId: "firm-1", trade: "Kaya Duvar" }], []);

    expect(rows).toHaveLength(1);
  });
});

describe("workerCountsFromEntry", () => {
  it("sıfır sayılı satırı BOŞ hücre olarak gösterir", () => {
    const values = workerCountsFromEntry([
      entryRow({ trade: "Kalıpçılar", source: "company", count: 0 }),
      entryRow({ id: "w-2", trade: "Demirciler", source: "subcontractor", count: 8 }),
    ]);

    expect(values["company|Kalıpçılar"]).toBe("");
    expect(values["subcontractor|Demirciler"]).toBe("8");
  });

  it("firma satırı FİRMA anahtarıyla gelir", () => {
    expect(workerCountsFromEntry([firmRow()])).toEqual({ "firm|firm-1": "6" });
  });
});

describe("parseWorkerCount", () => {
  it("boş hücre sıfırdır", () => {
    expect(parseWorkerCount("")).toBe(0);
    expect(parseWorkerCount("   ")).toBe(0);
  });

  it("pozitif tam sayıyı çevirir", () => {
    expect(parseWorkerCount(" 12 ")).toBe(12);
  });

  it("negatif / ondalıklı / metin değeri null döner (sessizce 0 YAZILMAZ)", () => {
    expect(parseWorkerCount("-1")).toBeNull();
    expect(parseWorkerCount("2.5")).toBeNull();
    expect(parseWorkerCount("2,5")).toBeNull();
    expect(parseWorkerCount("abc")).toBeNull();
  });
});

describe("invalidWorkerCountKeys", () => {
  it("yalnız geçersiz hücrelerin anahtarlarını döner", () => {
    expect(
      invalidWorkerCountKeys({
        "company|Kalıpçılar": "12",
        "general|Yardımcı": "-3",
        "subcontractor|Demirciler": "",
      }),
    ).toEqual(["general|Yardımcı"]);
  });
});

describe("firmManHours", () => {
  it("kişi × saat = a-s", () => {
    expect(Number(firmManHours("6", "9"))).toBe(54);
    expect(Number(firmManHours("4", "7,5"))).toBe(30);
  });

  it("saat boş ya da geçersizse hesaplanamaz (null)", () => {
    expect(firmManHours("6", "")).toBeNull();
    expect(firmManHours("6", "30")).toBeNull();
    expect(firmManHours("x", "9")).toBeNull();
  });
});

describe("diaryCrewTotals (G12a toplamı)", () => {
  const rows = buildWorkerRows([firmRow(), entryRow({ count: 4 })]);
  const values = { "firm|firm-1": "6", "company|Kalıpçılar": "4" };
  const hours = { "firm|firm-1": "9" };

  it("kişi = Σ headcount + Σ günlük satır (firma + eski)", () => {
    const totals = diaryCrewTotals([crew(), crew({ trade: "Demirci", headcount: 2, hours: "18.0" })], rows, values, hours);

    expect(totals.people).toBe(3 + 2 + 6 + 4);
  });

  it("a-s = Σ puantaj saati + Σ firma a-s (eski satır a-s taşımaz)", () => {
    const totals = diaryCrewTotals([crew(), crew({ trade: "Demirci", headcount: 2, hours: "18.5" })], rows, values, hours);

    expect(Number(totals.manHours)).toBe(27 + 18.5 + 6 * 9);
  });

  it("puantaj yoksa a-s yalnız firma a-s'idir", () => {
    const totals = diaryCrewTotals([], rows, values, hours);

    expect(totals.people).toBe(10);
    expect(Number(totals.manHours)).toBe(54);
  });

  it("günlük satırı yokken toplam puantajın kendisidir", () => {
    const totals = diaryCrewTotals([crew()], [], {}, {});

    expect(totals.people).toBe(3);
    expect(Number(totals.manHours)).toBe(27);
  });

  it("geçersiz kişi hücresi → kişi toplamı BASILMAZ (null)", () => {
    expect(diaryCrewTotals([crew()], rows, { ...values, "company|Kalıpçılar": "x" }, hours).people).toBeNull();
  });

  it("firma a-s hesaplanamıyorsa a-s toplamı BASILMAZ (null)", () => {
    expect(diaryCrewTotals([crew()], rows, values, { "firm|firm-1": "abc" }).manHours).toBeNull();
  });
});

describe("buildWorkerCountsBody", () => {
  it("geçersiz hücre varsa gövde ÜRETİLMEZ (null) — yanlış sayı yazılmaz", () => {
    const entryRows = [entryRow({ count: 4 })];

    expect(buildWorkerCountsBody(entryRows, buildWorkerRows(entryRows), { "company|Kalıpçılar": "-2" })).toBeNull();
  });

  it("eski kayıt satırı düzenlenir; 0'a çekilirse gövdeden düşer", () => {
    const entryRows = [entryRow({ count: 4 })];
    const rows = buildWorkerRows(entryRows);

    expect(buildWorkerCountsBody(entryRows, rows, { "company|Kalıpçılar": "5" })).toEqual([
      { trade: "Kalıpçılar", source: "company", count: 5, subcontractor_id: null, hours: null },
    ]);
    expect(buildWorkerCountsBody(entryRows, rows, { "company|Kalıpçılar": "0" })).toEqual([]);
  });

  it("🔴 TAM KÜME: ekranda GÖSTERİLMEYEN (sayısı 0) eski satır gövdede AYNEN korunur", () => {
    const entryRows = [
      entryRow({ trade: "Yardımcı", source: "general", count: 0 }),
      firmRow(),
    ];
    const rows = buildWorkerRows(entryRows);
    expect(rows.map(workerCountKey)).toEqual(["firm|firm-1"]);

    const body = buildWorkerCountsBody(entryRows, rows, {
      ...workerCountsFromEntry(entryRows),
      "firm|firm-1": "7",
    });

    expect(body).toEqual([
      { trade: "Yardımcı", source: "general", count: 0, subcontractor_id: null, hours: null },
      { trade: "Kaya Duvar", source: "subcontractor", count: 7, subcontractor_id: "firm-1", hours: "9.0" },
    ]);
  });

  it("firma satırı gövdede firma kimliği + SAATİYLE gider (saat ekranda düzenlenmese de korunur)", () => {
    const entryRows = [entryRow({ count: 12 }), firmRow()];
    const body = buildWorkerCountsBody(entryRows, buildWorkerRows(entryRows), {
      ...workerCountsFromEntry(entryRows),
      "company|Kalıpçılar": "14",
    });

    expect(body).toEqual([
      { trade: "Kalıpçılar", source: "company", count: 14, subcontractor_id: null, hours: null },
      { trade: "Kaya Duvar", source: "subcontractor", count: 6, subcontractor_id: "firm-1", hours: "9.0" },
    ]);
  });

  it("eklenen firma gövdeye girer; kaldırılan eski satır düşer", () => {
    const entryRows = [entryRow({ count: 4 })];
    const added = [{ subcontractorId: "firm-2", trade: "Deniz Tesisat" }];
    const removed = ["company|Kalıpçılar"];
    const rows = buildDiaryWorkerRows(entryRows, added, removed);
    const body = buildWorkerCountsBody(entryRows, rows, { "firm|firm-2": "3" }, { "firm|firm-2": "8" }, removed);

    expect(body).toEqual([
      { trade: "Deniz Tesisat", source: "subcontractor", count: 3, subcontractor_id: "firm-2", hours: 8 },
    ]);
  });
});

describe("areWorkerCountsDirty", () => {
  const entryRows = [entryRow({ count: 12 })];

  it("kayıtla aynı değerlerde false döner", () => {
    expect(areWorkerCountsDirty(entryRows, buildWorkerRows(entryRows), { "company|Kalıpçılar": "12" })).toBe(false);
  });

  it("gizli (sayısı 0) eski satır formu kirletmez", () => {
    const zeroRows = [entryRow({ count: 0 })];

    expect(areWorkerCountsDirty(zeroRows, buildWorkerRows(zeroRows), workerCountsFromEntry(zeroRows))).toBe(false);
  });

  it("değer değişince true döner", () => {
    expect(areWorkerCountsDirty(entryRows, buildWorkerRows(entryRows), { "company|Kalıpçılar": "13" })).toBe(true);
  });

  it("kayıtta olan satır ekranda boşaltılırsa true döner", () => {
    expect(areWorkerCountsDirty(entryRows, buildWorkerRows(entryRows), { "company|Kalıpçılar": "" })).toBe(true);
  });
});
