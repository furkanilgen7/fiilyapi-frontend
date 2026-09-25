import { describe, expect, it } from "vitest";

import {
  buildCopyPreviousWeekDraft,
  type CopySourceWeek,
} from "./timesheet-copy";
import { timesheetDraftKey } from "./timesheet-draft";
import type { TimesheetSourcedCell } from "./week-derive";

/**
 * "Önceki Haftayı Kopyala" — saf gövde. 2026-W38 (14–20 Eyl) → 2026-W39 (21–27 Eyl).
 * §3.14 P2: KİLİTLİ GÜN ATLANIR — ne temizlenir ne doldurulur.
 */
const TARGET_MONDAY = "2026-09-21";

const PREVIOUS: CopySourceWeek = {
  start_date: "2026-09-14",
  rows: [
    {
      personnel_id: "p-1",
      cells: [
        { work_date: "2026-09-14", hours: "8.0", code: null, section_id: null },
        {
          work_date: "2026-09-18",
          hours: "7.0",
          code: null,
          section_id: "sec-1",
        },
        {
          work_date: "2026-09-19",
          hours: null,
          code: "leave",
          section_id: null,
        },
      ],
    },
  ],
};

const CURRENT: TimesheetSourcedCell[] = [
  {
    personnelId: "p-1",
    work_date: "2026-09-21",
    hours: "9.0",
    code: null,
    section_id: null,
  },
  {
    personnelId: "p-1",
    work_date: "2026-09-27",
    hours: "4.0",
    code: null,
    section_id: null,
  },
];

describe("buildCopyPreviousWeekDraft", () => {
  it("kilit YOKKEN eski davranış: mevcut hücreler temizlenir, önceki hafta aynı gün ofsetine yazılır", () => {
    const { entries, cellCount } = buildCopyPreviousWeekDraft({
      allCells: CURRENT,
      previous: PREVIOUS,
      targetMonday: TARGET_MONDAY,
      lockedDays: new Set(),
    });
    expect(cellCount).toBe(3);
    expect(entries).toEqual({
      [timesheetDraftKey("p-1", "2026-09-21")]: {
        hours: "8.0",
        code: null,
        sectionId: null,
      },
      [timesheetDraftKey("p-1", "2026-09-25")]: {
        hours: "7.0",
        code: null,
        sectionId: "sec-1",
      },
      [timesheetDraftKey("p-1", "2026-09-26")]: {
        hours: null,
        code: "leave",
        sectionId: null,
      },
      [timesheetDraftKey("p-1", "2026-09-27")]: null,
    });
  });

  it("🔴 kilitli günler ATLANIR: ne temizlenir ne doldurulur; kilitsizler kopyalanır", () => {
    const { entries, cellCount } = buildCopyPreviousWeekDraft({
      allCells: CURRENT,
      previous: PREVIOUS,
      targetMonday: TARGET_MONDAY,
      lockedDays: new Set([
        "2026-09-21",
        "2026-09-22",
        "2026-09-23",
        "2026-09-24",
      ]),
    });
    // Pzt kilitli: önceki haftanın 8 saati YAZILMAZ, mevcut 9 saat SİLİNMEZ.
    expect(Object.hasOwn(entries, timesheetDraftKey("p-1", "2026-09-21"))).toBe(
      false,
    );
    expect(cellCount).toBe(2);
    expect(entries).toEqual({
      [timesheetDraftKey("p-1", "2026-09-25")]: {
        hours: "7.0",
        code: null,
        sectionId: "sec-1",
      },
      [timesheetDraftKey("p-1", "2026-09-26")]: {
        hours: null,
        code: "leave",
        sectionId: null,
      },
      [timesheetDraftKey("p-1", "2026-09-27")]: null,
    });
  });

  it("haftanın dışına düşen kaynak hücre yazılmaz", () => {
    const { cellCount } = buildCopyPreviousWeekDraft({
      allCells: [],
      previous: {
        start_date: "2026-09-14",
        rows: [
          {
            personnel_id: "p-9",
            cells: [
              {
                work_date: "2026-09-21",
                hours: "9.0",
                code: null,
                section_id: null,
              },
            ],
          },
        ],
      },
      targetMonday: TARGET_MONDAY,
      lockedDays: new Set(),
    });
    expect(cellCount).toBe(0);
  });
});
