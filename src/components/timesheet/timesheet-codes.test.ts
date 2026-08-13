import { describe, it, expect } from "vitest";

import { WORKER_SOURCE_LABELS as DIARY_WORKER_SOURCE_LABELS } from "@/components/site-diary/diary-labels";

import {
  legendCodesFor,
  resolveSourceBadgeVariant,
  resolveWorkerSourceLabel,
  TIMESHEET_CODES,
  WORKER_SOURCE_LABELS,
  WORKER_SOURCE_VALUES,
} from "./timesheet-codes";

// D1 — legend ekran basina AYRI (kullanici karari 2026-08-07).
describe("legendCodesFor", () => {
  it("E5 (79-84) DORT ogeyi aciklar: C · I · T · FM — G YOK", () => {
    const codes = legendCodesFor("general");
    expect(codes.map((meta) => meta.letter)).toEqual(["Ç", "İ", "T", "FM"]);
    expect(codes.map((meta) => meta.code)).not.toContain("temporary_duty");
  });

  it("SP (106-111) BES ogeyi aciklar (+G)", () => {
    expect(legendCodesFor("site").map((meta) => meta.letter)).toEqual([
      "Ç",
      "İ",
      "T",
      "FM",
      "G",
    ]);
  });

  it("HUCRE seti iki ekranda da besli kalir — E5'te G hucresi yine basilir", () => {
    // Legend'in daralmasi hucre setini DARALTMAZ; kayit gizlenmez.
    expect(TIMESHEET_CODES).toHaveLength(5);
    expect(TIMESHEET_CODES.map((meta) => meta.code)).toContain("temporary_duty");
  });
});

// D2 — etiketler uydurulmaz, repodaki tek kaynaktan gelir.
describe("WORKER_SOURCE_LABELS", () => {
  it("diary-labels.ts ile AYNI nesnedir (kopya sozcuk yok)", () => {
    expect(WORKER_SOURCE_LABELS).toBe(DIARY_WORKER_SOURCE_LABELS);
  });

  it("`general` icin 'Genel' kullanir (uydurma 'Yevmiyeli' DEGIL)", () => {
    expect(WORKER_SOURCE_LABELS.general).toBe("Genel");
    expect(WORKER_SOURCE_LABELS.company).toBe("Şirket");
    expect(WORKER_SOURCE_LABELS.subcontractor).toBe("Taşeron");
  });
});

// F-TB1 T5 — `worker_source` semasi BES degerlidir (schema.d.ts:12775:
// company/subcontractor/general/freelance/intern). Puantaj rozeti bu ikisini
// kullanir; test WORKER_SOURCE_VALUES (semadan turetilir) uzerinde DONER —
// enum buyurse Record<WorkerSource, …> tipleri derlemeyi kirar, bu test de
// yeni degeri otomatik kapsar.
describe("WORKER_SOURCE_VALUES — enum'un TUMU", () => {
  it("bes deger tasir ve `personel` ekranindakiyle AYNI kumedir", () => {
    expect(WORKER_SOURCE_VALUES).toHaveLength(5);
    expect(new Set(WORKER_SOURCE_VALUES)).toEqual(
      new Set(["company", "subcontractor", "general", "freelance", "intern"]),
    );
  });

  it("resolveWorkerSourceLabel HER deger icin Turkce etiket doner (ham deger sizmaz)", () => {
    for (const source of WORKER_SOURCE_VALUES) {
      const label = resolveWorkerSourceLabel(source);
      expect(label).toBe(WORKER_SOURCE_LABELS[source]);
      expect(label).not.toBe(source);
    }
  });

  it("resolveSourceBadgeVariant Sirket/Taseron DISINDA NOTR doner (uydurma renk yok)", () => {
    expect(resolveSourceBadgeVariant("company")).toBe("primary");
    expect(resolveSourceBadgeVariant("subcontractor")).toBe("warning");
    for (const neutralSource of ["general", "freelance", "intern"] as const) {
      expect(resolveSourceBadgeVariant(neutralSource)).toBe("neutral");
    }
  });

  it("taninmayan bir deger de NOTR rozete ve '—' etiketine duser (cokme yok)", () => {
    expect(resolveSourceBadgeVariant("unknown_future_source")).toBe("neutral");
    expect(resolveWorkerSourceLabel("unknown_future_source")).toBe("—");
  });
});
