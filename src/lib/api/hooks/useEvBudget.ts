import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type {
  EvBudgetView,
  EvPreviewOut,
  EvRevisionDiffOut,
  EvRevisionOut,
  EvScheduleOut,
  EvSuggestionsOut,
} from "@/lib/api/models";

// PLN-F1.6 · Adam-Saat Bütçesi OKUMA sorguları (backend B1 uçları, şantiye
// kapsamlı — K1). Tipler `models.ts` takma adlarıdır; elle arayüz yazılmaz.
//
// Önbellek anahtarları `[KÖK, siteId, …]` biçimindedir: yazma hook'ları
// (`useEvBudgetMutations`) `[KÖK, siteId]` önekiyle hepsini tazeler.

export const EV_BUDGET_KEY = "ev-budget";
export const EV_BUDGET_REVISIONS_KEY = "ev-budget-revisions";
export const EV_BUDGET_DIFF_KEY = "ev-budget-diff";
export const EV_BUDGET_SCHEDULE_KEY = "ev-budget-schedule";
export const EV_BUDGET_PREVIEW_KEY = "ev-budget-preview";
export const EV_BUDGET_SUGGESTIONS_KEY = "ev-budget-suggestions";

/** `revision_id` yalnız verildiğinde gider — yoksa backend "taslak › aktif" varsayılanını seçer. */
function revisionQuery(revisionId: string | null) {
  return revisionId ? { query: { revision_id: revisionId } } : {};
}

/**
 * `GET /sites/{id}/earned-value/budget` — ağaç + özet + dondurma engel/uyarı.
 * `revisionId` null → ekranın varsayılan revizyonu (taslak varsa taslak, yoksa
 * aktif, yoksa `revision: null` — B1-5).
 */
export function useEvBudget(
  siteId: string,
  revisionId: string | null,
): UseQueryResult<EvBudgetView, Error> {
  return useQuery({
    enabled: siteId.length > 0,
    queryKey: [EV_BUDGET_KEY, siteId, revisionId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/earned-value/budget", {
          params: { path: { site_id: siteId }, ...revisionQuery(revisionId) },
        }),
      ),
  });
}

/** Revizyon açılır listesi (durum · tarih). */
export function useEvBudgetRevisions(siteId: string): UseQueryResult<EvRevisionOut[], Error> {
  return useQuery({
    enabled: siteId.length > 0,
    queryKey: [EV_BUDGET_REVISIONS_KEY, siteId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/earned-value/budget/revisions", {
          params: { path: { site_id: siteId } },
        }),
      ),
  });
}

/** Revizyon farkı paneli — yalnız anahtar açıkken istenir (K22). */
export function useEvRevisionDiff(
  siteId: string,
  revisionId: string | null,
  enabled: boolean,
): UseQueryResult<EvRevisionDiffOut, Error> {
  return useQuery({
    enabled: enabled && siteId.length > 0 && revisionId !== null,
    queryKey: [EV_BUDGET_DIFF_KEY, siteId, revisionId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/earned-value/budget/revisions/{revision_id}/diff", {
          params: { path: { site_id: siteId, revision_id: revisionId ?? "" } },
        }),
      ),
  });
}

/** Adım 2 Gantt: bölümler + disiplin × bölüm pencereleri + tatiller. */
export function useEvBudgetSchedule(
  siteId: string,
  revisionId: string | null,
  enabled = true,
): UseQueryResult<EvScheduleOut, Error> {
  return useQuery({
    enabled: enabled && siteId.length > 0,
    queryKey: [EV_BUDGET_SCHEDULE_KEY, siteId, revisionId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/earned-value/budget/schedule", {
          params: { path: { site_id: siteId }, ...revisionQuery(revisionId) },
        }),
      ),
  });
}

/**
 * Adım 3 eğri önizlemesi — `POST` ama KALICI DEĞİL (B1 frontend isteği 2),
 * bu yüzden mutasyon değil SORGUDUR. Dağılım/pencere kalıcı uçlarla
 * yazıldığı için gövde yalnız revizyonu taşır; yazma sonrası anahtar tazelenir.
 */
export function useEvBudgetPreview(
  siteId: string,
  revisionId: string | null,
  enabled = true,
): UseQueryResult<EvPreviewOut, Error> {
  return useQuery({
    enabled: enabled && siteId.length > 0,
    queryKey: [EV_BUDGET_PREVIEW_KEY, siteId, revisionId],
    queryFn: async () =>
      unwrap(
        await backendClient.POST("/sites/{site_id}/earned-value/budget/preview", {
          params: { path: { site_id: siteId } },
          body: { revision_id: revisionId, distributions: [], windows: [] },
        }),
      ),
  });
}

/** Oran öneri popover'ı: katalog + son 3 şantiye gerçekleşeni (K4; B1'de `history` boş). */
export function useEvItemSuggestions(
  siteId: string,
  itemId: string | null,
): UseQueryResult<EvSuggestionsOut, Error> {
  return useQuery({
    enabled: siteId.length > 0 && itemId !== null,
    queryKey: [EV_BUDGET_SUGGESTIONS_KEY, siteId, itemId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/earned-value/budget/items/{boq_item_id}/suggestions", {
          params: { path: { site_id: siteId, boq_item_id: itemId ?? "" } },
        }),
      ),
  });
}
