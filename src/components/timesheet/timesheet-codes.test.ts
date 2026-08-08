import { describe, it, expect } from "vitest";

import { WORKER_SOURCE_LABELS as DIARY_WORKER_SOURCE_LABELS } from "@/components/site-diary/diary-labels";

import { legendCodesFor, TIMESHEET_CODES, WORKER_SOURCE_LABELS } from "./timesheet-codes";

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
