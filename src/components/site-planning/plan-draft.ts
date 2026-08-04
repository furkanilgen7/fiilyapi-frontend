import type {
  PlanCellTag,
  PlanGoalStatus,
  PlanResourceKind,
  SitePlanWeek,
} from "@/lib/api/hooks/useSitePlan";

/**
 * Planlama ekranının YEREL TASLAK modeli (F-PL T3) — SAF veri, React yok.
 *
 * Neden ayrı bir taslak: dört uç da DEĞİŞTİRME (replace) semantiğindedir, yani
 * gövde ekranın o anki TAM halidir. Sunucu verisini doğrudan düzenlemek
 * mümkün olmadığından (React Query önbelleği salt-okunur kabul edilir) ızgara,
 * hedefler ve sprint tek bir taslakta yaşar; "Kaydet" bu taslaktan gövde üretir.
 *
 * Taslak sunucu gerçeğinden KURULUR ve kirli olmadığı sürece her tazelemede
 * yeniden kurulur (bkz. `usePlanDraft`).
 */

export interface PlanDraftCell {
  readonly text: string;
  readonly tag: PlanCellTag | null;
}

export interface PlanDraftRow {
  /** Ekran içi KALICI kimlik. Sunucu satırında `row-<uuid>`, yeni satırda `new-row-N`. */
  readonly key: string;
  /** Sunucudaki kimlik; yeni satırda `null` (ilk `rows` PUT'undan sonra dolar). */
  readonly serverId: string | null;
  readonly kind: PlanResourceKind;
  readonly sectionId: string | null;
  readonly label: string;
  readonly plannedWorkerCount: number | null;
  /** `plan_date` → hücre. SEYREKTİR: planı olmayan günün anahtarı YOKTUR. */
  readonly cells: Readonly<Record<string, PlanDraftCell>>;
}

export interface PlanDraftGoal {
  readonly key: string;
  readonly serverId: string | null;
  readonly title: string;
  /** Boş dize = not yok (gövdede `null`a çevrilir). */
  readonly note: string;
  readonly isDone: boolean;
  readonly status: PlanGoalStatus;
}

/** Grup BAŞLIĞI bilgisi (satırları taşımaz — satırlar tek düz listede durur). */
export interface PlanDraftGroup {
  readonly key: string;
  readonly kind: PlanResourceKind;
  readonly sectionId: string | null;
  readonly sectionName: string | null;
  readonly sectionManagerName: string | null;
}

/** Dört PUT'un dört kirlilik bayrağı — kirli olmayan bölüme İSTEK ATILMAZ. */
export type PlanDraftSection = "rows" | "cells" | "goals" | "sprint";
export type PlanDraftDirty = Readonly<Record<PlanDraftSection, boolean>>;

export interface PlanDraft {
  /** Hücrelerin kapsamı: taslak YALNIZ bu haftanın hücrelerini taşır. */
  readonly weekStart: string;
  readonly groups: readonly PlanDraftGroup[];
  readonly rows: readonly PlanDraftRow[];
  readonly goals: readonly PlanDraftGoal[];
  /** Boş dize = aktif sprint yok / kapatılacak. */
  readonly sprintName: string;
  readonly dirty: PlanDraftDirty;
  /** Yerel kimlik sayacı — asla geri sarılmaz, silinen anahtar tekrar kullanılmaz. */
  readonly nextLocalId: number;
}

export const CLEAN_DIRTY: PlanDraftDirty = {
  rows: false,
  cells: false,
  goals: false,
  sprint: false,
};

/** Gruplama anahtarı `(kind, section_id)` — backend'in gruplama ölçütüyle aynı. */
export function planGroupKey(kind: PlanResourceKind, sectionId: string | null): string {
  return `${kind}::${sectionId ?? ""}`;
}

export function planDraftRowKey(serverId: string): string {
  return `row-${serverId}`;
}

export function planDraftGoalKey(serverId: string): string {
  return `goal-${serverId}`;
}

/** Plan henüz yüklenmemişken kullanılan boş taslak (hook ilk kurulumu). */
export function emptyPlanDraft(weekStart: string): PlanDraft {
  return {
    weekStart,
    groups: [],
    rows: [],
    goals: [],
    sprintName: "",
    dirty: CLEAN_DIRTY,
    nextLocalId: 1,
  };
}

/**
 * Sunucu yanıtından taslak kurar.
 *
 * Satırlar gruplardan DÜZ bir listeye açılır: `rows` PUT'u şantiyenin TÜM
 * satırlarını tek gövdede ister, dolayısıyla kaydetme sırası ekrandaki düz
 * sıradır. Grup başlıkları ayrı bir listede saklanır (`groups`) ki başlık
 * bilgisi (bölüm adı/sorumlusu) satır eklenip silindikçe kaybolmasın.
 */
export function buildPlanDraft(plan: SitePlanWeek): PlanDraft {
  return {
    weekStart: plan.week_start,
    groups: plan.groups.map((group) => ({
      key: planGroupKey(group.kind, group.section_id),
      kind: group.kind,
      sectionId: group.section_id,
      sectionName: group.section_name,
      sectionManagerName: group.section_manager_name,
    })),
    rows: plan.groups.flatMap((group) =>
      group.rows.map((row) => ({
        key: planDraftRowKey(row.id),
        serverId: row.id,
        kind: row.kind,
        sectionId: row.section_id,
        label: row.label,
        plannedWorkerCount: row.planned_worker_count,
        cells: Object.fromEntries(
          row.cells.map((cell) => [cell.plan_date, { text: cell.text, tag: cell.tag }]),
        ),
      })),
    ),
    goals: plan.goals.map((goal) => ({
      key: planDraftGoalKey(goal.id),
      serverId: goal.id,
      title: goal.title,
      note: goal.note ?? "",
      isDone: goal.is_done,
      status: goal.status,
    })),
    sprintName: plan.active_sprint?.name ?? "",
    dirty: CLEAN_DIRTY,
    nextLocalId: 1,
  };
}

export function isPlanDraftDirty(draft: PlanDraft): boolean {
  return Object.values(draft.dirty).some(Boolean);
}

/** Bir grubun satırları — ekrandaki sıra korunur. */
export function planDraftRowsOfGroup(
  draft: PlanDraft,
  group: PlanDraftGroup,
): readonly PlanDraftRow[] {
  return draft.rows.filter((row) => planGroupKey(row.kind, row.sectionId) === group.key);
}
