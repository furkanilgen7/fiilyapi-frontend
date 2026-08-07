import { describe, it, expect } from "vitest";

import { buildTimesheetView } from "./derive";
import type { TimesheetSourcedCell } from "./derive";
import {
  buildTimesheetSaveBody,
  mergeDraftCells,
  overtimeHoursText,
  parseOvertimeHours,
  resolveCellSectionId,
  timesheetDraftKey,
  type TimesheetDraft,
} from "./timesheet-draft";

// F-PT T3 · Taslak katmanı ve KAPSAM KURALI (bu dilimin en kritik tuzağı).

const SERVER_CELLS: TimesheetSourcedCell[] = [
  {
    personnelId: "per-1",
    work_date: "2026-09-01",
    code: "worked",
    overtime_hours: null,
    section_id: "sec-1",
  },
  {
    personnelId: "per-4",
    work_date: "2026-09-01",
    code: "worked",
    overtime_hours: null,
    section_id: "sec-2",
  },
];

const MATRIX = {
  site_id: "s-1",
  site_name: "A-Blok",
  project_id: "p-1",
  project_name: "Güneşkent",
  year: 2026,
  month: 9,
  section_id: null,
  section_name: null,
  worker_count: 2,
  total_man_days: 2,
  total_overtime_hours: "0",
  day_totals: [],
  rows: [
    {
      personnel_id: "per-1",
      full_name: "Ahmet Yılmaz",
      trade: "Kalıpçı",
      source: "company",
      subcontractor_name: null,
      man_days: 1,
      cells: [SERVER_CELLS[0]],
    },
    {
      personnel_id: "per-4",
      full_name: "Cem Aksoy",
      trade: "Demirci",
      source: "company",
      subcontractor_name: null,
      man_days: 1,
      cells: [SERVER_CELLS[1]],
    },
  ],
} as never;

describe("mergeDraftCells", () => {
  it("taslaksiz kume sunucu kumesinin AYNISIDIR", () => {
    expect(mergeDraftCells(SERVER_CELLS, {})).toHaveLength(2);
  });

  it("yeni hucre EKLER (kaydi olmayan gune kod girilebilir)", () => {
    const draft: TimesheetDraft = {
      [timesheetDraftKey("per-1", "2026-09-02")]: {
        code: "overtime",
        overtimeHours: "3.5",
        sectionId: "sec-1",
      },
    };
    const merged = mergeDraftCells(SERVER_CELLS, draft);
    expect(merged).toHaveLength(3);
    expect(merged).toContainEqual({
      personnelId: "per-1",
      work_date: "2026-09-02",
      code: "overtime",
      overtime_hours: "3.5",
      section_id: "sec-1",
    });
  });

  it("mevcut hucreyi DEGISTIRIR, 'Temizle' (null) hucreyi DUSURUR", () => {
    const draft: TimesheetDraft = {
      [timesheetDraftKey("per-1", "2026-09-01")]: {
        code: "leave",
        overtimeHours: null,
        sectionId: "sec-1",
      },
      [timesheetDraftKey("per-4", "2026-09-01")]: null,
    };
    const merged = mergeDraftCells(SERVER_CELLS, draft);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ personnelId: "per-1", code: "leave" });
  });

  it("FM disindaki kodda saat SURUKLENMEZ", () => {
    const draft: TimesheetDraft = {
      [timesheetDraftKey("per-1", "2026-09-01")]: {
        code: "worked",
        overtimeHours: "4",
        sectionId: "sec-1",
      },
    };
    const merged = mergeDraftCells(SERVER_CELLS, draft);
    expect(merged.find((c) => c.personnelId === "per-1")?.overtime_hours).toBeNull();
  });
});

describe("buildTimesheetSaveBody", () => {
  it("govdeye YALNIZ sema alanlarini yazar (additionalProperties: false)", () => {
    const body = buildTimesheetSaveBody(SERVER_CELLS);
    expect(Object.keys(body)).toEqual(["cells"]);
    const cells = body.cells ?? [];
    expect(Object.keys(cells[0]).sort()).toEqual([
      "code",
      "overtime_hours",
      "personnel_id",
      "section_id",
      "work_date",
    ]);
    // `personnelId` (istemci alani) ve `project_id` govdeye SIZMAZ.
    expect(cells[0]).not.toHaveProperty("personnelId");
    expect(cells[0]).not.toHaveProperty("project_id");
  });
});

/* ═══ KAPSAM KANITI ═══════════════════════════════════════════════════════
 * `PUT` donem+santiye kapsaminda DEGISTIRMEDIR: govdede gecmeyen hucre
 * SILINIR. Asagidaki iki test, bolum filtresi ACIKKEN kurulan govdenin DIGER
 * bolumun hucresini de tasidigini kanitlar. Govde `rows`tan kurulsaydi bu
 * testler kirmizi olurdu — canlida ise diger bolumun ayi silinirdi.
 * ═══════════════════════════════════════════════════════════════════════ */
describe("KAPSAM KURALI · bolum filtresi acikken govde TAM kumedir", () => {
  it("suzulmus gorunumde bile allCells iki bolumun hucresini de tasir", () => {
    const view = buildTimesheetView({
      year: 2026,
      month: 9,
      personnel: [],
      matrix: MATRIX,
      sectionId: "sec-1", // YALNIZ Kat 6-10 goruntuleniyor
    });

    // Gorunum SUZULMUS: sec-2'nin hucresi ekranda YOK.
    const visible = view.rows.flatMap((row) => Object.keys(row.cells));
    expect(visible).toHaveLength(1);

    // Govde ise TAM: sec-2'nin hucresi de gonderilir.
    const cells = buildTimesheetSaveBody(view.allCells).cells ?? [];
    expect(cells).toHaveLength(2);
    expect(cells.map((cell) => cell.section_id).sort()).toEqual(["sec-1", "sec-2"]);
  });

  it("filtreli gorunumde yapilan duzenleme diger bolumun hucresini SILMEZ", () => {
    const draft: TimesheetDraft = {
      [timesheetDraftKey("per-1", "2026-09-03")]: {
        code: "worked",
        overtimeHours: null,
        sectionId: "sec-1",
      },
    };
    const view = buildTimesheetView({
      year: 2026,
      month: 9,
      personnel: [],
      matrix: MATRIX,
      sectionId: "sec-1",
      draft,
    });
    const cells = buildTimesheetSaveBody(view.allCells).cells ?? [];
    expect(cells).toHaveLength(3);
    expect(
      cells.some((cell) => cell.personnel_id === "per-4" && cell.section_id === "sec-2"),
    ).toBe(true);
  });
});

describe("resolveCellSectionId", () => {
  it("MEVCUT hucrenin bolumunu KORUR (aktif filtre bolumu degistirmez)", () => {
    expect(resolveCellSectionId(SERVER_CELLS, "per-4", "2026-09-01", "sec-1")).toBe("sec-2");
  });

  it("YENI hucre aktif filtrenin bolumunu alir", () => {
    expect(resolveCellSectionId(SERVER_CELLS, "per-1", "2026-09-09", "sec-1")).toBe("sec-1");
  });

  it("filtre kapaliyken yeni hucre bolumsuzdur", () => {
    expect(resolveCellSectionId(SERVER_CELLS, "per-1", "2026-09-09", null)).toBeNull();
  });
});

describe("parseOvertimeHours", () => {
  it("bos metin GECERLIDIR — saat opsiyoneldir (saatsiz FM)", () => {
    expect(parseOvertimeHours("   ")).toEqual({ ok: true, value: null });
  });

  it("virgullu ondalik kabul edilir ve noktaya cevrilir", () => {
    expect(parseOvertimeHours("3,5")).toEqual({ ok: true, value: "3.5" });
  });

  it("iki ondalik REDDEDILIR (backend en fazla bir basamak kabul eder)", () => {
    expect(parseOvertimeHours("3,55").ok).toBe(false);
  });

  it("sinirlar: 0 REDDEDILIR, 24 gecerli, 24.1 REDDEDILIR", () => {
    expect(parseOvertimeHours("0").ok).toBe(false);
    expect(parseOvertimeHours("24")).toEqual({ ok: true, value: "24" });
    expect(parseOvertimeHours("24,1").ok).toBe(false);
  });

  it("sayi olmayan metin REDDEDILIR", () => {
    expect(parseOvertimeHours("abc").ok).toBe(false);
  });
});

describe("overtimeHoursText", () => {
  it("sunucunun '3.00' degeri duzenlenebilir '3'e doner", () => {
    expect(overtimeHoursText("3.00")).toBe("3");
    expect(overtimeHoursText("2.50")).toBe("2,5");
    expect(overtimeHoursText(null)).toBe("");
  });
});
