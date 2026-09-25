import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { backendClient } from "@/lib/api/client";
import type { EvSettingsRead, EvSettingsSave } from "@/lib/api/models";
import { unwrap } from "@/lib/api/unwrap";

import { PROJECT_LIST_MAX_LIMIT, useProjects } from "./useProjects";
import { sitesQueryOptions } from "./useSites";

/**
 * PLN-F1.4 · `Ayarlar > Planlama` veri katmanı (PLANLAMA-SPEC §3.8 K1, B1).
 *
 * Ayarlar ŞANTİYE kapsamlıdır (K1): şirket varsayılanı katmanı yoktur; satırı
 * olmayan şantiye için GET sabit varsayılanları `is_default: true` ile döner.
 * PUT TAM DEĞİŞTİRMEDİR — gövdede olmayan tatil/paçal SİLİNİR; yanıt güncel GET
 * gövdesidir. Tamamlanmış şantiyede PUT 409 (§3.10 F0-8).
 */
export const EV_SETTINGS_QUERY_KEY = "ev-settings";

export function evSettingsQueryKey(siteId: string): readonly unknown[] {
  return [EV_SETTINGS_QUERY_KEY, siteId];
}

/** `siteId` boşsa ağa ÇIKILMAZ (`useSite`/`useBoq` boş-id kapısı). */
export function useEvSettings(siteId: string): UseQueryResult<EvSettingsRead, Error> {
  return useQuery({
    enabled: siteId.length > 0,
    queryKey: evSettingsQueryKey(siteId),
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/earned-value/settings", {
          params: { path: { site_id: siteId } },
        }),
      ),
  });
}

/**
 * `PUT /sites/{id}/earned-value/settings` — tek toplu kayıt.
 *
 * Yanıt güncel GET gövdesi olduğu için önbelleğe DOĞRUDAN yazılır (ikinci bir
 * GET beklenmez; ekran "Kaydedildi" hâline aynı karede geçer). Hata (422/409)
 * önbelleğe dokunmaz — form taslağı kullanıcıda kalır.
 */
export function useSaveEvSettings(
  siteId: string,
): UseMutationResult<EvSettingsRead, Error, EvSettingsSave> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) =>
      unwrap(
        await backendClient.PUT("/sites/{site_id}/earned-value/settings", {
          params: { path: { site_id: siteId } },
          body,
        }),
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData(evSettingsQueryKey(siteId), saved);
    },
  });
}

/** Ek:420 `sites()` satırı — proje başlığı altında şantiye + "tamamlandı" notu. */
export interface EvSiteOption {
  siteId: string;
  siteName: string;
  projectId: string;
  projectName: string;
  /** §3.10 F0-8: seçilebilir kalır, ayarları SALT OKUNUR. */
  isCompleted: boolean;
}

export interface EvSiteGroup {
  projectId: string;
  projectName: string;
  sites: EvSiteOption[];
}

export interface EvSiteOptionsState {
  options: EvSiteOption[];
  groups: EvSiteGroup[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * Ayarlar - Planlama şantiye seçicisinin seçenekleri (Ek:71-89 · M7).
 *
 * `useSiteOptions` (E5 puantaj seçicisi) etiketi tek dizeye indirir ve şantiye
 * DURUMUNU taşımaz; bu ekran ise proje başlıklı gruplar ve "tamamlandı · salt
 * okunur" işareti ister (Ek:78-86). Aynı sorgu seçenekleri (`useProjects` +
 * `sitesQueryOptions`) kullanılır — önbellek PAYLAŞILIR, ikinci istek doğmaz.
 */
export function useEvSiteOptions(): EvSiteOptionsState {
  const projectsQuery = useProjects({ limit: PROJECT_LIST_MAX_LIMIT });
  const projects = projectsQuery.data?.items ?? [];
  const siteQueries = useQueries({
    queries: projects.map((project) => sitesQueryOptions(project.id)),
  });

  const groups: EvSiteGroup[] = projects
    .map((project, index) => ({
      projectId: project.id,
      projectName: project.name,
      sites: (siteQueries[index]?.data?.items ?? []).map((site) => ({
        siteId: site.id,
        siteName: site.name,
        projectId: project.id,
        projectName: project.name,
        isCompleted: site.status === "completed",
      })),
    }))
    .filter((group) => group.sites.length > 0);

  return {
    options: groups.flatMap((group) => group.sites),
    groups,
    isLoading: projectsQuery.isLoading || siteQueries.some((query) => query.isLoading),
    isError: projectsQuery.isError || siteQueries.some((query) => query.isError),
  };
}
