"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { backendErrorMessage } from "@/lib/api/error-message";
import {
  useCreateEvDraft,
  useDeleteEvDraft,
  useFillEvFromCatalog,
  useFreezeEvBudget,
  usePatchEvItem,
  usePatchEvLeaves,
  usePutEvDistributions,
  usePutEvGroupDisciplines,
  usePutEvWindows,
  type EvDistributionPair,
  type EvFreezeBody,
  type EvItemPatch,
  type EvLeafPatch,
  type EvWindowIn,
} from "@/lib/api/hooks/useEvBudgetMutations";
import type { EvFillOut, EvRevisionOut } from "@/lib/api/models";

import { nextSearch, parseStep, REV_PARAM, STEP_PARAM, type BudgetUrlPatch } from "./budget-url";

/** BÜT:561 `flash` — bildirim 2,6 sn sonra kalkar. */
const FLASH_MS = 2600;
const SAVE_ERROR = "Değişiklik kaydedilemedi.";

export type FlashTone = "success" | "danger";
export interface Flash {
  message: string;
  tone: FlashTone;
}

export function useFlash() {
  const [flash, setFlash] = useState<Flash | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const show = useCallback((message: string, tone: FlashTone = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setFlash({ message, tone });
    timer.current = setTimeout(() => setFlash(null), FLASH_MS);
  }, []);
  return { flash, show };
}

/** `?rev=` + `?adim=` okuma/yazma (URL-as-state). */
export function useBudgetUrlState() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const update = useCallback(
    (patch: BudgetUrlPatch) => {
      const params = nextSearch(new URLSearchParams(searchParams.toString()), patch);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  return {
    step: parseStep(searchParams.get(STEP_PARAM)),
    revisionId: searchParams.get(REV_PARAM),
    update,
  };
}

/** Fill sonucu bildirimi (BÜT:667 + B1-4: belirsiz/eşleşmesiz sayıları). */
export function fillMessage(out: EvFillOut): string {
  if (out.filled_leaf_count === 0 && out.ambiguous_count === 0 && out.unmatched_count === 0) {
    return "Boş oran yok · mevcut oranlar korunuyor";
  }
  const parts = [`${out.filled_leaf_count} boş satır katalogdan dolduruldu`];
  if (out.ambiguous_count > 0) parts.push(`${out.ambiguous_count} kalemde eşleşme belirsiz`);
  if (out.unmatched_count > 0) parts.push(`${out.unmatched_count} kalemde katalog eşleşmesi yok`);
  return parts.join(" · ");
}

/**
 * Ekranın bütün yazma eylemleri — hata her zaman görünür bildirime döner
 * (sessiz yutma yok); başarıda isteğe bağlı bildirim.
 */
export function useBudgetActions(siteId: string) {
  const { flash, show } = useFlash();
  const leaves = usePatchEvLeaves(siteId);
  const item = usePatchEvItem(siteId);
  const groups = usePutEvGroupDisciplines(siteId);
  const fill = useFillEvFromCatalog(siteId);
  const distributions = usePutEvDistributions(siteId);
  const windows = usePutEvWindows(siteId);
  const createDraft = useCreateEvDraft(siteId);
  const deleteDraft = useDeleteEvDraft(siteId);
  const freeze = useFreezeEvBudget(siteId);

  async function run<T>(task: () => Promise<T>, success?: (value: T) => string): Promise<T | null> {
    try {
      const value = await task();
      if (success) show(success(value));
      return value;
    } catch (error) {
      show(backendErrorMessage(error, SAVE_ERROR), "danger");
      return null;
    }
  }

  return {
    flash,
    showFlash: show,
    saveLeaves: (patches: EvLeafPatch[], success?: string) =>
      run(() => leaves.mutateAsync(patches), success ? () => success : undefined),
    patchItem: (itemId: string, patch: EvItemPatch) => run(() => item.mutateAsync({ itemId, patch })),
    mapGroup: (groupId: string, disciplineId: string | null) =>
      run(() => groups.mutateAsync([{ boq_group_id: groupId, discipline_id: disciplineId }])),
    fillFromCatalog: () => run(() => fill.mutateAsync(), fillMessage),
    setDistribution: (pair: EvDistributionPair) => run(() => distributions.mutateAsync([pair])),
    saveWindows: (next: EvWindowIn[]) => run(() => windows.mutateAsync(next)),
    openDraft: () => run(() => createDraft.mutateAsync()),
    deleteDraft: (revisionId: string) => run(() => deleteDraft.mutateAsync(revisionId).then(() => true)),
    freeze: (body: EvFreezeBody): Promise<EvRevisionOut | null> => run(() => freeze.mutateAsync(body)),
    isFilling: fill.isPending,
    isFreezing: freeze.isPending,
    isDeleting: deleteDraft.isPending,
    isOpeningDraft: createDraft.isPending,
  };
}

export type BudgetActions = ReturnType<typeof useBudgetActions>;
