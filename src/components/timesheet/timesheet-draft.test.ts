import { describe, expect, it } from "vitest";

import {
  buildWeekSaveBody,
  dayHoursText,
  isEmptyCell,
  MAX_DAY_HOURS,
  mergeDraftCells,
  parseDayHours,
  resolveCellSectionId,
  timesheetDraftKey,
  type TimesheetDraft,
} from "./timesheet-draft";
import type { TimesheetSourcedCell } from "./week-derive";

const cell = (
  personnelId: string,
  workDate: string,
  extra: Partial<TimesheetSourcedCell> = {},
): TimesheetSourcedCell => ({
  personnelId,
  work_date: workDate,
  hours: "9",
  code: null,
  section_id: null,
  ...extra,
});

describe("mergeDraftCells", () => {
  it("taslak sunucu hücresini EZER (aynı kişi-gün)", () => {
    const server = [cell("p1", "2026-07-13", { hours: "9" })];
    const draft: TimesheetDraft = {
      [timesheetDraftKey("p1", "2026-07-13")]: { hours: "6", code: null, sectionId: null },
    };
    expect(mergeDraftCells(server, draft)).toEqual([
      { personnelId: "p1", work_date: "2026-07-13", hours: "6", code: null, section_id: null },
    ]);
  });

  it("dokunulmamış sunucu hücresi AYNEN kalır", () => {
    const server = [cell("p1", "2026-07-13"), cell("p2", "2026-07-14", { hours: "8" })];
    const draft: TimesheetDraft = {
      [timesheetDraftKey("p1", "2026-07-13")]: { hours: "4", code: null, sectionId: null },
    };
    const merged = mergeDraftCells(server, draft);
    expect(merged).toContainEqual(
      expect.objectContaining({ personnelId: "p2", work_date: "2026-07-14", hours: "8" }),
    );
  });

  it("`null` taslak değeri (“Temizle”) hücreyi kümeden DÜŞÜRÜR — gövdede geçmeyen hücre silinir", () => {
    const server = [cell("p1", "2026-07-13")];
    const draft: TimesheetDraft = { [timesheetDraftKey("p1", "2026-07-13")]: null };
    expect(mergeDraftCells(server, draft)).toEqual([]);
  });

  it("🔴 SAAT XOR KOD: kod seçilince saat SÜRÜKLENMEZ", () => {
    const draft: TimesheetDraft = {
      [timesheetDraftKey("p1", "2026-07-14")]: {
        hours: "9",
        code: "leave",
        sectionId: "sec-1",
      },
    };
    expect(mergeDraftCells([], draft)).toEqual([
      {
        personnelId: "p1",
        work_date: "2026-07-14",
        hours: null,
        code: "leave",
        section_id: "sec-1",
      },
    ]);
  });

  it("içi boşalmış (saatsiz + kodsuz) taslak hücresi kümeye GİRMEZ", () => {
    const draft: TimesheetDraft = {
      [timesheetDraftKey("p1", "2026-07-15")]: { hours: "", code: null, sectionId: null },
    };
    expect(mergeDraftCells([], draft)).toEqual([]);
  });

  it("sonuç kişi + gün sırasına göre SABİTTİR (render sırasından bağımsız)", () => {
    const merged = mergeDraftCells([cell("p2", "2026-07-14"), cell("p1", "2026-07-15")], {
      [timesheetDraftKey("p1", "2026-07-13")]: { hours: "3", code: null, sectionId: null },
    });
    expect(merged.map((c) => `${c.personnelId}|${c.work_date}`)).toEqual([
      "p1|2026-07-13",
      "p1|2026-07-15",
      "p2|2026-07-14",
    ]);
  });
});

describe("buildWeekSaveBody", () => {
  it("gövde alanları TEK TEK yazılır — istemci alanı (`personnelId`) SIZMAZ", () => {
    const body = buildWeekSaveBody([
      cell("p1", "2026-07-13", { hours: "9", section_id: "sec-1" }),
    ]);
    expect(body).toEqual({
      cells: [
        {
          personnel_id: "p1",
          work_date: "2026-07-13",
          hours: "9",
          code: null,
          section_id: "sec-1",
        },
      ],
    });
    expect(Object.keys(body.cells?.[0] ?? {})).not.toContain("personnelId");
  });

  it("boş hücre gövdeye GİRMEZ (uç `saat XOR kod` bekler)", () => {
    expect(
      buildWeekSaveBody([cell("p1", "2026-07-13", { hours: null, code: null })]).cells,
    ).toEqual([]);
  });
});

describe("resolveCellSectionId", () => {
  it("MEVCUT hücrenin bölümü KORUNUR — aktif filtre onu değiştirmez", () => {
    const cells = [cell("p1", "2026-07-13", { section_id: "sec-2" })];
    expect(resolveCellSectionId(cells, "p1", "2026-07-13", "sec-1")).toBe("sec-2");
  });

  it("YENİ hücre aktif filtrenin bölümünü alır", () => {
    expect(resolveCellSectionId([], "p1", "2026-07-13", "sec-1")).toBe("sec-1");
  });

  it("filtre kapalıyken yeni hücre bölümsüz (null) açılır", () => {
    expect(resolveCellSectionId([], "p1", "2026-07-13", null)).toBeNull();
  });
});

describe("parseDayHours", () => {
  it("boş metin GEÇERLİDİR ve `null` döner (gün boşaltıldı)", () => {
    expect(parseDayHours("   ")).toEqual({ ok: true, value: null });
  });

  it("Türkçe klavyenin virgülünü kabul eder", () => {
    expect(parseDayHours("7,5")).toEqual({ ok: true, value: "7.5" });
  });

  it("iki ondalık basamak REDDEDİLİR (uç deseni tek basamaktır)", () => {
    const result = parseDayHours("7,55");
    expect(result.ok).toBe(false);
  });

  it(`sıfır ve ${MAX_DAY_HOURS} üstü REDDEDİLİR (uç sınırı 0 < saat <= 24)`, () => {
    expect(parseDayHours("0").ok).toBe(false);
    expect(parseDayHours("24").ok).toBe(true);
    expect(parseDayHours("24.1").ok).toBe(false);
  });

  it("harf/işaret REDDEDİLİR", () => {
    expect(parseDayHours("-3").ok).toBe(false);
    expect(parseDayHours("abc").ok).toBe(false);
  });
});

describe("dayHoursText", () => {
  it("sunucunun `9.00`ını düzenlenebilir `9`a indirger", () => {
    expect(dayHoursText("9.00")).toBe("9");
  });

  it("anlamlı ondalığı KORUR ve TR virgülüne çevirir", () => {
    expect(dayHoursText("7.50")).toBe("7,5");
  });

  it("boş/null boş metindir", () => {
    expect(dayHoursText(null)).toBe("");
    expect(dayHoursText("  ")).toBe("");
  });
});

describe("isEmptyCell", () => {
  it("kodlu hücre boş DEĞİLDİR (saati olmasa da)", () => {
    expect(isEmptyCell({ hours: null, code: "leave" })).toBe(false);
  });

  it("saatsiz + kodsuz hücre boştur", () => {
    expect(isEmptyCell({ hours: "", code: null })).toBe(true);
  });
});
