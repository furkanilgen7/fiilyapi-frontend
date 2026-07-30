import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import {
  BOQ_QUERY_KEY,
  type BoqGroup,
  type BoqGroupCreate,
  type BoqItem,
  type BoqItemCreate,
  type BoqItemUpdate,
} from "./useBoq";

// Ekran 13 · Is Kalemleri (BOQ) yazma uclari (spec §6.3), useSectionMutations
// deseniyle ayni: siteId hook'a baglanir, mutate yalnizca govdeyi alir.
//
// Optimistik guncelleme YOK: `amount` / `group_total` / `grand_total` sunucu
// turevidir, iyimser yazmak yanlis toplam gosterir.
//
// `useDeleteBoqItem` ve grup PATCH hook'u BILEREK yazilmadi (spec §7.4, §7.5):
// DELETE ucu backend'de yok, grup guncelleme UI'dan cagrilmiyor — olu kod olurdu.

function useBoqInvalidator(siteId: string): () => void {
  const queryClient = useQueryClient();
  // Tek sorgu hem tabloyu hem toplamlari tasidigindan tek gecersiz kilma yeter.
  return () => {
    queryClient.invalidateQueries({ queryKey: [BOQ_QUERY_KEY, siteId] });
  };
}

export function useCreateBoqGroup(
  siteId: string,
): UseMutationResult<BoqGroup, Error, BoqGroupCreate> {
  const invalidate = useBoqInvalidator(siteId);
  return useMutation({
    mutationFn: async (body) =>
      unwrap(
        await backendClient.POST("/sites/{site_id}/boq/groups", {
          params: { path: { site_id: siteId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useCreateBoqItem(
  siteId: string,
): UseMutationResult<BoqItem, Error, BoqItemCreate> {
  const invalidate = useBoqInvalidator(siteId);
  return useMutation({
    mutationFn: async (body) =>
      unwrap(
        await backendClient.POST("/sites/{site_id}/boq/items", {
          params: { path: { site_id: siteId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  });
}

/**
 * Kalem guncelleme. `siteId` YALNIZ gecersiz kilma anahtari icin alinir —
 * ucun yolu santiyesizdir: `/boq/items/{item_id}` (spec §6.3).
 */
export function useUpdateBoqItem(
  siteId: string,
): UseMutationResult<BoqItem, Error, { itemId: string; body: BoqItemUpdate }> {
  const invalidate = useBoqInvalidator(siteId);
  return useMutation({
    mutationFn: async ({ itemId, body }) =>
      unwrap(
        await backendClient.PATCH("/boq/items/{item_id}", {
          params: { path: { item_id: itemId } },
          body,
        }),
      ),
    onSuccess: invalidate,
  });
}
