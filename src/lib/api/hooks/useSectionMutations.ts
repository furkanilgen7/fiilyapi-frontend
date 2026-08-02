import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";
import { SITE_QUERY_KEY } from "./useSites";
import { SECTION_QUERY_KEY, type SectionDetailResponse } from "./useSection";

export type SectionCreateRequest = components["schemas"]["SectionCreate"];
export type SectionResponse = components["schemas"]["SectionResponse"];
export type SectionUpdateRequest = components["schemas"]["SectionUpdate"];

// Task 10 — SectionFormModal'in olusturma ucu (T3'te tam sayfa form bu hook'u
// devralacak, SectionFormModal EMEKLI edilecek — bkz. _global-constraints.md).
// useCreateSite (Task 7) deseniyle ayni: siteId hook'a baglanir, mutate
// yalnizca govdeyi alir. Bolum listesi VE hero'daki
// section_count/section_status_counts tek bir sorgudan (useSite) geldigi icin
// SITE_QUERY_KEY'i gecersiz kilmak ikisini de tazeler. Yeni bolumun kendi
// detay sorgusu (SECTION_QUERY_KEY) henuz cache'te YOKTUR (id olusturmadan
// once bilinmez) — gecersiz kilinacak bir sey yok, bu yuzden burada
// dokunulmuyor.
export function useCreateSection(siteId: string): UseMutationResult<SectionResponse, Error, SectionCreateRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) =>
      unwrap(
        await backendClient.POST("/sites/{site_id}/sections", {
          params: { path: { site_id: siteId } },
          body,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITE_QUERY_KEY, siteId] });
    },
  });
}

// P6 · T1 — Bölüm Detay ekranindaki tam sayfa formun guncelleme ucu.
// `SectionUpdate`te `site_id` YOKTUR (bolum baska santiyeye tasinamaz) ama
// yanit govdesi `SectionDetailResponse` `site_id`yi TASIR — hangi santiyenin
// gecersiz kilinacagi caller'dan ayrica istenmeden yanittan turetilir.
// Basaride HEM bolum detay anahtari HEM SITE_QUERY_KEY gecersiz kilinir:
// bolum listesi ve hero'daki section_count/section_status_counts useSite'tan
// geliyor, isim/durum/tarih degisikligi orada da yansimali.
export function useUpdateSection(
  sectionId: string,
): UseMutationResult<SectionDetailResponse, Error, SectionUpdateRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) =>
      unwrap(
        await backendClient.PATCH("/sections/{section_id}", {
          params: { path: { section_id: sectionId } },
          body,
        }),
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [SECTION_QUERY_KEY, sectionId] });
      queryClient.invalidateQueries({ queryKey: [SITE_QUERY_KEY, data.site_id] });
    },
  });
}
