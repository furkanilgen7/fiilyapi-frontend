import { describe, it, expect } from "vitest";

import type { PlanDraft, PlanDraftRow } from "./plan-draft";
import { CLEAN_DIRTY } from "./plan-draft";
import {
  buildCellsBody,
  buildGoalsBody,
  buildRowIdMap,
  buildRowsBody,
  buildSprintBody,
  existingRowIdMap,
  findDuplicateRowLabel,
  hasBlankRowLabel,
} from "./plan-save-bodies";

// F-PL T3 · gövde üreticileri SAFTIR. Kritik iki kural burada korunur:
// `rows` ŞANTİYENİN TAMAMI, `cells` YALNIZ GÖRÜNEN HAFTA.

function row(overrides: Partial<PlanDraftRow> = {}): PlanDraftRow {
  return {
    key: "row-pr-1",
    serverId: "pr-1",
    kind: "crew",
    sectionId: "sec-1",
    label: "Kalıpçı",
    plannedWorkerCount: 14,
    cells: {},
    ...overrides,
  };
}

function draft(overrides: Partial<PlanDraft> = {}): PlanDraft {
  return {
    weekStart: "2026-08-03",
    groups: [],
    rows: [row()],
    goals: [],
    sprintName: "",
    dirty: CLEAN_DIRTY,
    nextLocalId: 1,
    ...overrides,
  };
}

describe("buildRowsBody", () => {
  it("TUM satirlari ekrandaki sirayla basar (sort_order = indeks)", () => {
    const body = buildRowsBody(
      draft({
        rows: [
          row(),
          row({ key: "new-row-1", serverId: null, label: "Demirci", plannedWorkerCount: 18 }),
        ],
      }),
    );
    expect(body.rows).toHaveLength(2);
    expect(body.rows?.[1]).toMatchObject({ id: null, label: "Demirci", sort_order: 1 });
  });

  it("ekipman satirinin section_id'si ve isci sayisi gonderilmez (422 tuzagi)", () => {
    const body = buildRowsBody(
      draft({
        rows: [row({ kind: "equipment", sectionId: "sec-1", label: "Vinç", plannedWorkerCount: 3 })],
      }),
    );
    expect(body.rows?.[0]).toMatchObject({ section_id: null, planned_worker_count: null });
  });
});

describe("buildRowIdMap", () => {
  it("yeni satiri DOGAL ANAHTARLA (kind, section_id, label) eslestirir", () => {
    const rows = [row(), row({ key: "new-row-1", serverId: null, label: "Demirci" })];
    const map = buildRowIdMap(rows, [
      { id: "pr-9", kind: "crew", section_id: "sec-1", label: "Demirci", planned_worker_count: 18, sort_order: 1 },
      { id: "pr-1", kind: "crew", section_id: "sec-1", label: "Kalıpçı", planned_worker_count: 14, sort_order: 0 },
    ]);
    // Yanit sirasi DEGISSE de eslesme bozulmaz — indeks/sort_order kullanilmaz.
    expect(map.get("new-row-1")).toBe("pr-9");
    expect(map.get("row-pr-1")).toBe("pr-1");
  });

  it("ekipman satirini section_id null'a normalize ederek eslestirir", () => {
    const rows = [row({ key: "new-row-2", serverId: null, kind: "equipment", sectionId: "sec-1", label: "Vinç" })];
    const map = buildRowIdMap(rows, [
      { id: "pr-7", kind: "equipment", section_id: null, label: "Vinç", planned_worker_count: null, sort_order: 0 },
    ]);
    expect(map.get("new-row-2")).toBe("pr-7");
  });
});

describe("findDuplicateRowLabel / hasBlankRowLabel", () => {
  it("ayni grupta ayni etiketi yakalar", () => {
    expect(findDuplicateRowLabel([row(), row({ key: "new-row-1", serverId: null })])).toBe("Kalıpçı");
  });

  it("farkli grupta ayni etiket yinelenme DEGILDIR", () => {
    expect(
      findDuplicateRowLabel([row(), row({ key: "r2", sectionId: "sec-2" })]),
    ).toBeNull();
  });

  it("bos etiketli satiri bildirir", () => {
    expect(hasBlankRowLabel([row({ label: "  " })])).toBe(true);
    expect(hasBlankRowLabel([row()])).toBe(false);
  });
});

describe("buildCellsBody", () => {
  const weekRow = row({
    cells: {
      "2026-08-05": { text: "Kat 9 Kalıp", tag: "blue" },
      // KAPSAM DISI: bir sonraki haftanın günü — gövdeye girerse backend 422 verir.
      "2026-08-11": { text: "Sonraki hafta", tag: "gray" },
      "2026-08-06": { text: "   ", tag: null },
    },
  });

  it("YALNIZ gorunen haftanin dolu hucrelerini basar", () => {
    const body = buildCellsBody(draft({ rows: [weekRow] }), new Map());
    expect(body.cells).toHaveLength(1);
    expect(body.cells?.[0]).toEqual({
      row_id: "pr-1",
      plan_date: "2026-08-05",
      text: "Kat 9 Kalıp",
      tag: "blue",
    });
  });

  it("yeni satirin hucresi ROWS YANITINDAN gelen kimlikle gonderilir", () => {
    const newRow = row({
      key: "new-row-1",
      serverId: null,
      cells: { "2026-08-04": { text: "Kalıp", tag: null } },
    });
    const body = buildCellsBody(draft({ rows: [newRow] }), new Map([["new-row-1", "pr-9"]]));
    expect(body.cells?.[0]?.row_id).toBe("pr-9");
  });

  it("kimligi hala bilinmeyen satirin hucresi GONDERILMEZ", () => {
    const newRow = row({
      key: "new-row-1",
      serverId: null,
      cells: { "2026-08-04": { text: "Kalıp", tag: null } },
    });
    expect(buildCellsBody(draft({ rows: [newRow] }), new Map()).cells).toHaveLength(0);
  });
});

describe("existingRowIdMap", () => {
  it("yalniz sunucuda var olan satirlari tasir", () => {
    const map = existingRowIdMap([row(), row({ key: "new-row-1", serverId: null })]);
    expect(map.get("row-pr-1")).toBe("pr-1");
    expect(map.has("new-row-1")).toBe(false);
  });
});

describe("buildGoalsBody / buildSprintBody", () => {
  it("basligi bos hedef gonderilmez, not bos ise null olur", () => {
    const body = buildGoalsBody(
      draft({
        goals: [
          { key: "g1", serverId: "pg-1", title: "Kat 9", note: "  ", isDone: true, status: "waiting" },
          { key: "g2", serverId: null, title: "   ", note: "", isDone: false, status: "waiting" },
        ],
      }),
    );
    expect(body.goals).toHaveLength(1);
    // `is_done` ile `status` BAGIMSIZ gider — biri digerinden turetilmez.
    expect(body.goals?.[0]).toEqual({
      id: "pg-1",
      title: "Kat 9",
      note: null,
      is_done: true,
      status: "waiting",
      sort_order: 0,
    });
  });

  it("bos sprint adi null gonderir (aktif sprinti kapatir)", () => {
    expect(buildSprintBody(draft({ sprintName: "   " }))).toEqual({ name: null });
    expect(buildSprintBody(draft({ sprintName: " Kat 8–9 " }))).toEqual({ name: "Kat 8–9" });
  });
});
