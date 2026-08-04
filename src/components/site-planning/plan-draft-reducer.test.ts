import { describe, it, expect } from "vitest";

import type { SitePlanWeek } from "@/lib/api/hooks/useSitePlan";

import { buildPlanDraft, isPlanDraftDirty, type PlanDraft } from "./plan-draft";
import { planCellValue, planDraftReducer } from "./plan-draft-reducer";

// F-PL T3 · taslak indirgeyicisi SAFTIR: hiçbir eylem girdiyi mutasyona
// uğratmaz, her eylem yalnız kendi bölümünü kirletir.

const WEEK: SitePlanWeek = {
  site_id: "s-1",
  site_name: "A-Blok",
  project_id: "p-1",
  project_name: "Güneşkent Konut",
  week_start: "2026-08-03",
  week_end: "2026-08-09",
  days: [],
  groups: [
    {
      kind: "crew",
      section_id: "sec-1",
      section_name: "Kat 6–10 Kaba",
      section_manager_name: "Sercan Öztürk",
      rows: [
        {
          id: "pr-1",
          kind: "crew",
          section_id: "sec-1",
          label: "Kalıpçı",
          planned_worker_count: 14,
          sort_order: 0,
          cells: [{ plan_date: "2026-08-05", text: "Kat 9 Kalıp", tag: "blue" }],
        },
      ],
    },
    {
      kind: "equipment",
      section_id: null,
      section_name: null,
      section_manager_name: null,
      rows: [
        {
          id: "pr-4",
          kind: "equipment",
          section_id: null,
          label: "Tower Crane",
          planned_worker_count: null,
          sort_order: 1,
          cells: [],
        },
      ],
    },
  ],
  goals: [
    {
      id: "pg-1",
      title: "Kat 9 kalıp montajı",
      note: null,
      is_done: false,
      status: "waiting",
      sort_order: 0,
    },
  ],
  active_sprint: { id: "ps-1", name: "Kat 8–9 Tamamlama" },
};

function baseDraft(): PlanDraft {
  return buildPlanDraft(WEEK);
}

describe("buildPlanDraft", () => {
  it("gruplari duz satir listesine acar ve temiz baslar", () => {
    const draft = baseDraft();
    expect(draft.rows.map((row) => row.label)).toEqual(["Kalıpçı", "Tower Crane"]);
    expect(draft.rows[0]?.cells["2026-08-05"]).toEqual({ text: "Kat 9 Kalıp", tag: "blue" });
    expect(draft.sprintName).toBe("Kat 8–9 Tamamlama");
    expect(isPlanDraftDirty(draft)).toBe(false);
  });

  it("sprint yoksa ad BOS DIZEdir (null degil)", () => {
    expect(buildPlanDraft({ ...WEEK, active_sprint: null }).sprintName).toBe("");
  });
});

describe("planDraftReducer — hücre", () => {
  it("hucre yazar ve YALNIZ cells bolumunu kirletir", () => {
    const draft = baseDraft();
    const next = planDraftReducer(draft, {
      type: "setCell",
      rowKey: draft.rows[0]!.key,
      planDate: "2026-08-04",
      cell: { text: "Kat 9 Kalıp", tag: "green" },
    });
    expect(next.rows[0]?.cells["2026-08-04"]).toEqual({ text: "Kat 9 Kalıp", tag: "green" });
    expect(next.dirty).toEqual({ rows: false, cells: true, goals: false, sprint: false });
    // Girdi MUTASYONA ugramaz.
    expect(draft.rows[0]?.cells["2026-08-04"]).toBeUndefined();
  });

  it("bos metin hucreyi SILER (metin bos = silme)", () => {
    const draft = baseDraft();
    const next = planDraftReducer(draft, {
      type: "setCell",
      rowKey: draft.rows[0]!.key,
      planDate: "2026-08-05",
      cell: planCellValue("   ", "blue"),
    });
    expect(next.rows[0]?.cells["2026-08-05"]).toBeUndefined();
  });

  it("null hucre (Temizle) kaydi kaldirir", () => {
    const draft = baseDraft();
    const next = planDraftReducer(draft, {
      type: "setCell",
      rowKey: draft.rows[0]!.key,
      planDate: "2026-08-05",
      cell: null,
    });
    expect(Object.keys(next.rows[0]!.cells)).toHaveLength(0);
  });
});

describe("planDraftReducer — satır", () => {
  it("ekip satiri grubun bolumunu alir", () => {
    const next = planDraftReducer(baseDraft(), {
      type: "addRow",
      row: { kind: "crew", sectionId: "sec-1", label: "Demirci", plannedWorkerCount: 18 },
    });
    const added = next.rows.at(-1);
    expect(added).toMatchObject({ kind: "crew", sectionId: "sec-1", plannedWorkerCount: 18 });
    expect(added?.serverId).toBeNull();
    expect(next.dirty.rows).toBe(true);
  });

  it("EKIPMAN satirinin section_id'si ve isci sayisi ZORLA null olur", () => {
    const next = planDraftReducer(baseDraft(), {
      type: "addRow",
      row: { kind: "equipment", sectionId: "sec-1", label: "Vinç", plannedWorkerCount: 5 },
    });
    expect(next.rows.at(-1)).toMatchObject({ sectionId: null, plannedWorkerCount: null });
  });

  it("satir silme yalniz rows bolumunu kirletir (hucreler CASCADE gider)", () => {
    const draft = baseDraft();
    const next = planDraftReducer(draft, { type: "removeRow", rowKey: draft.rows[0]!.key });
    expect(next.rows).toHaveLength(1);
    expect(next.dirty).toEqual({ rows: true, cells: false, goals: false, sprint: false });
  });
});

describe("planDraftReducer — rowsSaved", () => {
  it("yeni satiri DOGAL ANAHTARDAN gercek kimlige baglar ve rows'u temizler", () => {
    const withNew = planDraftReducer(baseDraft(), {
      type: "addRow",
      row: { kind: "crew", sectionId: "sec-1", label: "Demirci", plannedWorkerCount: 18 },
    });
    const saved = planDraftReducer(withNew, {
      type: "rowsSaved",
      saved: [
        { id: "pr-1", kind: "crew", section_id: "sec-1", label: "Kalıpçı", planned_worker_count: 14, sort_order: 0 },
        { id: "pr-4", kind: "equipment", section_id: null, label: "Tower Crane", planned_worker_count: null, sort_order: 1 },
        { id: "pr-9", kind: "crew", section_id: "sec-1", label: "Demirci", planned_worker_count: 18, sort_order: 2 },
      ],
    });
    const added = saved.rows.find((row) => row.label === "Demirci");
    expect(added?.serverId).toBe("pr-9");
    expect(added?.key).toBe("row-pr-9");
    expect(saved.dirty.rows).toBe(false);
    // Hucreler DOKUNULMAZ — kendi adiminda gonderilir.
    expect(saved.rows[0]?.cells["2026-08-05"]?.text).toBe("Kat 9 Kalıp");
  });
});

describe("planDraftReducer — hedef ve sprint", () => {
  it("yeni hedef bos baslikla ve verilen durumla eklenir", () => {
    const next = planDraftReducer(baseDraft(), { type: "addGoal", status: "waiting" });
    expect(next.goals.at(-1)).toMatchObject({ title: "", status: "waiting", serverId: null });
    expect(next.dirty.goals).toBe(true);
  });

  it("is_done ile status BAGIMSIZ yazilir", () => {
    const draft = baseDraft();
    const next = planDraftReducer(draft, {
      type: "updateGoal",
      goalKey: draft.goals[0]!.key,
      patch: { isDone: true },
    });
    expect(next.goals[0]).toMatchObject({ isDone: true, status: "waiting" });
  });

  it("hedef silinir", () => {
    const draft = baseDraft();
    const next = planDraftReducer(draft, { type: "removeGoal", goalKey: draft.goals[0]!.key });
    expect(next.goals).toHaveLength(0);
  });

  it("sprint adi bos birakilabilir (aktif sprinti kapatir)", () => {
    const next = planDraftReducer(baseDraft(), { type: "setSprintName", name: "" });
    expect(next.sprintName).toBe("");
    expect(next.dirty.sprint).toBe(true);
  });
});

describe("planDraftReducer — sectionSaved / reset", () => {
  it("sectionSaved yalniz kendi bayragini dusurur", () => {
    const dirty = planDraftReducer(
      planDraftReducer(baseDraft(), { type: "setSprintName", name: "Yeni" }),
      { type: "addGoal", status: "waiting" },
    );
    const next = planDraftReducer(dirty, { type: "sectionSaved", section: "goals" });
    expect(next.dirty).toEqual({ rows: false, cells: false, goals: false, sprint: true });
  });

  it("reset taslagi sunucu gerceginden yeniden kurar", () => {
    const dirty = planDraftReducer(baseDraft(), { type: "setSprintName", name: "Kirli" });
    const next = planDraftReducer(dirty, { type: "reset", plan: WEEK });
    expect(next.sprintName).toBe("Kat 8–9 Tamamlama");
    expect(isPlanDraftDirty(next)).toBe(false);
  });
});
