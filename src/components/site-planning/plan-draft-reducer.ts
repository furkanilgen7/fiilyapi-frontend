import type { PlanCellTag, PlanGoalStatus, PlanResourceKind, SitePlanWeek } from "@/lib/api/hooks/useSitePlan";
import type { SitePlanRowSaved } from "@/lib/api/hooks/useSitePlanMutations";

import {
  buildPlanDraft,
  planDraftRowKey,
  planGroupKey,
  type PlanDraft,
  type PlanDraftCell,
  type PlanDraftDirty,
  type PlanDraftGoal,
  type PlanDraftRow,
  type PlanDraftSection,
} from "./plan-draft";
import { buildRowIdMap } from "./plan-save-bodies";

/**
 * Taslağın SAF indirgeyicisi (F-PL T3). Hiçbir durum MUTASYONA uğramaz —
 * her eylem yeni nesne döndürür.
 */

export interface PlanDraftNewRow {
  readonly kind: PlanResourceKind;
  readonly sectionId: string | null;
  /** Seçilen bölümün adı — grubu ızgarada YOKSA başlığı buradan kurulur (T5). */
  readonly sectionName: string | null;
  readonly sectionManagerName: string | null;
  readonly label: string;
  readonly plannedWorkerCount: number | null;
}

export type PlanDraftGoalPatch = Partial<
  Pick<PlanDraftGoal, "title" | "note" | "isDone" | "status">
>;

export type PlanDraftAction =
  | { readonly type: "reset"; readonly plan: SitePlanWeek }
  /** `cell === null` → hücreyi boşalt (metin boş = silme). */
  | {
      readonly type: "setCell";
      readonly rowKey: string;
      readonly planDate: string;
      readonly cell: PlanDraftCell | null;
    }
  | { readonly type: "addRow"; readonly row: PlanDraftNewRow }
  | { readonly type: "removeRow"; readonly rowKey: string }
  | { readonly type: "addGoal"; readonly status: PlanGoalStatus }
  | { readonly type: "updateGoal"; readonly goalKey: string; readonly patch: PlanDraftGoalPatch }
  | { readonly type: "removeGoal"; readonly goalKey: string }
  | { readonly type: "setSprintName"; readonly name: string }
  /** `rows` PUT başarılı: yeni satırlar gerçek kimliğine bağlanır. */
  | { readonly type: "rowsSaved"; readonly saved: readonly SitePlanRowSaved[] }
  | { readonly type: "sectionSaved"; readonly section: PlanDraftSection };

function markDirty(dirty: PlanDraftDirty, section: PlanDraftSection): PlanDraftDirty {
  return { ...dirty, [section]: true };
}

function mapRows(
  draft: PlanDraft,
  map: (row: PlanDraftRow) => PlanDraftRow,
  section: PlanDraftSection,
): PlanDraft {
  return { ...draft, rows: draft.rows.map(map), dirty: markDirty(draft.dirty, section) };
}

function withCell(
  draft: PlanDraft,
  rowKey: string,
  planDate: string,
  cell: PlanDraftCell | null,
): PlanDraft {
  const isEmpty = cell === null || cell.text.trim().length === 0;
  return mapRows(
    draft,
    (row) => {
      if (row.key !== rowKey) return row;
      const cells = { ...row.cells };
      if (isEmpty) delete cells[planDate];
      else if (cell !== null) cells[planDate] = cell;
      return { ...row, cells };
    },
    "cells",
  );
}

/**
 * Yeni satır + gerekiyorsa YENİ GRUP (T5 bulgusu).
 *
 * Gruplar sunucudan gelirken YALNIZ mevcut satırlardan türer; boş bir planda
 * hiç grup yoktur ve satırı olmayan bir bölümün de grubu yoktur. Grup burada
 * da açılmasaydı eklenen satır ızgarada HİÇ görünmezdi. Gruplama ölçütü
 * değişmedi: `(kind, section_id)`.
 */
function withNewRow(draft: PlanDraft, input: PlanDraftNewRow): PlanDraft {
  // Backend kuralı: ekipman satırının `section_id`si OLAMAZ (422).
  const sectionId = input.kind === "equipment" ? null : input.sectionId;
  const row: PlanDraftRow = {
    key: `new-row-${draft.nextLocalId}`,
    serverId: null,
    kind: input.kind,
    sectionId,
    label: input.label,
    plannedWorkerCount: input.kind === "equipment" ? null : input.plannedWorkerCount,
    cells: {},
  };
  const groupKey = planGroupKey(row.kind, sectionId);
  const hasGroup = draft.groups.some((group) => group.key === groupKey);
  const groups = hasGroup
    ? draft.groups
    : [
        ...draft.groups,
        {
          key: groupKey,
          kind: row.kind,
          sectionId,
          sectionName: sectionId === null ? null : input.sectionName,
          sectionManagerName: sectionId === null ? null : input.sectionManagerName,
        },
      ];
  return {
    ...draft,
    groups,
    rows: [...draft.rows, row],
    nextLocalId: draft.nextLocalId + 1,
    dirty: markDirty(draft.dirty, "rows"),
  };
}

function withNewGoal(draft: PlanDraft, status: PlanGoalStatus): PlanDraft {
  const goal: PlanDraftGoal = {
    key: `new-goal-${draft.nextLocalId}`,
    serverId: null,
    title: "",
    note: "",
    isDone: false,
    status,
  };
  return {
    ...draft,
    goals: [...draft.goals, goal],
    nextLocalId: draft.nextLocalId + 1,
    dirty: markDirty(draft.dirty, "goals"),
  };
}

/**
 * `rows` yanıtı: yeni satırlar gerçek kimliğe bağlanır ve satır bölümü temize
 * çıkar. Hücreler DOKUNULMAZ — kirliyse kendi adımında gönderilir.
 */
function withSavedRows(draft: PlanDraft, saved: readonly SitePlanRowSaved[]): PlanDraft {
  const idMap = buildRowIdMap(draft.rows, saved);
  return {
    ...draft,
    rows: draft.rows.map((row) => {
      const id = idMap.get(row.key);
      if (id === undefined || id === row.serverId) return row;
      return { ...row, serverId: id, key: planDraftRowKey(id) };
    }),
    dirty: { ...draft.dirty, rows: false },
  };
}

export function planDraftReducer(state: PlanDraft, action: PlanDraftAction): PlanDraft {
  switch (action.type) {
    case "reset":
      return buildPlanDraft(action.plan);
    case "setCell":
      return withCell(state, action.rowKey, action.planDate, action.cell);
    case "addRow":
      return withNewRow(state, action.row);
    case "removeRow":
      return {
        ...state,
        rows: state.rows.filter((row) => row.key !== action.rowKey),
        dirty: markDirty(state.dirty, "rows"),
      };
    case "addGoal":
      return withNewGoal(state, action.status);
    case "updateGoal":
      return {
        ...state,
        goals: state.goals.map((goal) =>
          goal.key === action.goalKey ? { ...goal, ...action.patch } : goal,
        ),
        dirty: markDirty(state.dirty, "goals"),
      };
    case "removeGoal":
      return {
        ...state,
        goals: state.goals.filter((goal) => goal.key !== action.goalKey),
        dirty: markDirty(state.dirty, "goals"),
      };
    case "setSprintName":
      return { ...state, sprintName: action.name, dirty: markDirty(state.dirty, "sprint") };
    case "rowsSaved":
      return withSavedRows(state, action.saved);
    case "sectionSaved":
      return { ...state, dirty: { ...state.dirty, [action.section]: false } };
  }
}

/** Hücre düzenleyicinin ürettiği değer — boş metin `null` demektir. */
export function planCellValue(text: string, tag: PlanCellTag | null): PlanDraftCell | null {
  return text.trim().length === 0 ? null : { text, tag };
}
