"use client";

import type { UseQueryResult } from "@tanstack/react-query";

import { ErrorCard } from "@/components/earned-value/common/state";
import type { DiaryExtension, DiaryExtensionContext } from "@/components/site-diary/diary-extension";
import { useEvBudget, useEvBudgetRevisions } from "@/lib/api/hooks/useEvBudget";
import { useEvCodeTree, useEvDay } from "@/lib/api/hooks/useEvDay";
import { useSaveDayAllocation } from "@/lib/api/hooks/useEvDayMutations";
import { useEvSettings } from "@/lib/api/hooks/useEvSettings";
import { useSite } from "@/lib/api/hooks/useSites";
import type { EvAllocationSave, EvCodeNode, EvDayView, EvSettingsRead } from "@/lib/api/models";
import { BackendError } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { DEFAULT_PF_BANDS, type PfBandSettings } from "@/lib/earned-value";
import { routes } from "@/lib/routes";

import { buildAllocationBody, stripValues } from "./allocation-model";
import { saveAllocationIfDirty } from "./before-save";
import { ForemanBand } from "./ForemanBand";
import { buildCodeIndex } from "./code-tree";
import { DayLockBanner } from "./DayLockBanner";
import { HourAllocationBlock } from "./HourAllocationBlock";
import { formatDayWeek } from "./day-header";
import { activeRevisionId, buildItemFacts, type ItemFacts } from "./item-meta";
import { buildLineColumns } from "./line-columns";
import { buildSubmitState, resolveAllocationAccess } from "./submit-checks";
import { useAllocationDraft, type AllocationDraftApi } from "./useAllocationDraft";
import { useEvDayFreshness } from "./useEvDayFreshness";

/** Şantiyede planlama YOK sayılan yanıtlar: görünmüyor (404) / baseline yok (409). */
const ABSENT_STATUSES = new Set([403, 404, 409]);

/**
 * Çekirdeğin bildirdiği bağlamdan (`onExtensionContext`) planlama yuvalarını
 * kurar. EV'si olmayan şantiyede (aktif baseline yok → `has_baseline: false`,
 * ya da 404/409) `undefined` döner: çekirdek bugünkü gibi çalışır (B2-3).
 */
export function useDiaryProgressExtension(ctx: DiaryExtensionContext | null): DiaryExtension | undefined {
  const evPermission = useModulePermission("earned_value");
  const diaryPermission = useModulePermission("site_diary");
  const siteId = evPermission.canView ? (ctx?.siteId ?? "") : "";
  const day = ctx?.day ?? "";
  const dayQuery = useEvDay(siteId, day);
  const hasBaseline = dayQuery.data?.has_baseline === true;
  const activeSite = hasBaseline ? siteId : "";
  const codeTree = useEvCodeTree(activeSite, hasBaseline);
  const settings = useEvSettings(activeSite);
  const site = useSite(activeSite);
  // Kalem doğrudan/dolaylı + kendi/taşeron → AKTİF baseline'ın bütçe görünümü.
  const activeRevision = activeRevisionId(useEvBudgetRevisions(activeSite).data);
  const budget = useEvBudget(activeRevision === null ? "" : activeSite, activeRevision);
  const draftApi = useAllocationDraft(siteId, hasBaseline ? dayQuery.data : undefined);
  const saveAllocation = useSaveDayAllocation(siteId, day);
  useEvDayFreshness(siteId, day, ctx?.entryId ?? null, ctx?.entryStatus ?? null);

  if (ctx === null || siteId === "" || day === "") return undefined;
  if (dayQuery.isError) {
    if (dayQuery.error instanceof BackendError && ABSENT_STATUSES.has(dayQuery.error.status)) return undefined;
    return { fullWidthBlock: <DayLoadError onRetry={() => void dayQuery.refetch()} retrying={dayQuery.isFetching} /> };
  }
  if (dayQuery.data === undefined || !hasBaseline || draftApi === null) return undefined;
  return buildExtension({
    ctx,
    siteId,
    day,
    view: dayQuery.data,
    codeTree,
    bands: bandsFrom(settings.data),
    draftApi,
    saveAllocation: saveAllocation.mutateAsync,
    itemFacts: buildItemFacts(budget.data),
    evLevel: evPermission.level,
    diaryCanWrite: diaryPermission.canWrite,
    isSiteCompleted: site.data?.status === "completed",
    budgetHref: site.data ? routes.projects.sites.evBudget({ projectId: site.data.project.id, siteId: site.data.id }) : null,
  });
}

interface BuildInput {
  ctx: DiaryExtensionContext;
  siteId: string;
  day: string;
  view: EvDayView;
  codeTree: UseQueryResult<EvCodeNode[], Error>;
  bands: PfBandSettings;
  draftApi: AllocationDraftApi;
  saveAllocation: (body: EvAllocationSave) => Promise<unknown>;
  itemFacts: ItemFacts;
  evLevel: ReturnType<typeof useModulePermission>["level"];
  diaryCanWrite: boolean;
  isSiteCompleted: boolean;
  budgetHref: string | null;
}

function buildExtension(input: BuildInput): DiaryExtension {
  const { view, draftApi } = input;
  const isLocked = view.lock.locked;
  const access = resolveAllocationAccess({ evLevel: input.evLevel, diaryCanWrite: input.diaryCanWrite, isLocked, isSiteCompleted: input.isSiteCompleted });
  const strip = stripValues(view, draftApi.draft, draftApi.isDirty);
  const submitState = buildSubmitState({
    submit: view.submit,
    unallocated: strip.unallocated,
    reason: draftApi.draft.reason,
    isDirty: draftApi.isDirty,
    isLocked,
    isForeman: access.isForeman,
  });
  return {
    headerSuffix: formatDayWeek(view.day_no, view.week_no) ?? undefined,
    lock: isLocked
      ? { isLocked: true, banner: <DayLockBanner siteId={input.siteId} day={input.day} lock={view.lock} canUnlock={access.canUnlock} /> }
      : null,
    submitGate: submitState.gate,
    topBanner: access.showForemanBand ? <ForemanBand /> : undefined,
    // S1 — çekirdeğin tek kayıt düğmesi önce dağıtımı yazar; hata çekirdek kaydını durdurur.
    onBeforeSave: () => saveAllocationIfDirty({ ...beforeSaveInput(input), canEdit: access.canEdit }),
    lineColumns: lineColumnsFor(input),
    itemMeta: {
      indirectItemIds: input.itemFacts.indirectItemIds,
      renderItemTag: (boqItemId) => input.itemFacts.contractorLabel(boqItemId),
    },
    fullWidthBlock: (
      <HourAllocationBlock
        siteId={input.siteId}
        day={input.day}
        view={view}
        codeTree={input.codeTree}
        bands={input.bands}
        access={access}
        draft={draftApi.draft}
        isDirty={draftApi.isDirty}
        invalidCount={draftApi.invalidCount}
        onDraftChange={draftApi.update}
        submitState={submitState}
      />
    ),
  };
}

function beforeSaveInput({ draftApi, view, saveAllocation }: BuildInput) {
  return {
    isDirty: draftApi.isDirty,
    invalidCount: draftApi.invalidCount,
    buildBody: () => buildAllocationBody(draftApi.draft, view.rows),
    save: saveAllocation,
  };
}

function lineColumnsFor(input: BuildInput) {
  return buildLineColumns({
    lines: input.ctx.lines,
    progress: input.view.progress,
    index: buildCodeIndex(input.codeTree.data ?? []),
    bands: input.bands,
    budgetHref: input.budgetHref,
    revisionNumber: input.view.revision_number,
  });
}

/** Şantiyenin PF eşikleri (Ayarlar > Planlama); gelmediyse varsayılan bantlar. */
function bandsFrom(settings: EvSettingsRead | undefined): PfBandSettings {
  if (settings === undefined) return DEFAULT_PF_BANDS;
  const { daily, weekly } = settings.pf_bands;
  return {
    daily: { redBelow: daily.red_below, greenFrom: daily.green_from, highAbove: daily.high_above },
    weekly: { redBelow: weekly.red_below, greenFrom: weekly.green_from },
  };
}

/** K24 — ortak hâl kartı; sessiz boş blok yok. */
function DayLoadError({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <ErrorCard
      title="Saat dağıtımı yüklenemedi"
      description="Planlama verisi alınamadı; günlük kaydı etkilenmez."
      onRetry={onRetry}
      retrying={retrying}
    />
  );
}
