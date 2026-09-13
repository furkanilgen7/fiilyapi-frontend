import { useQueries } from "@tanstack/react-query";

import { useProjects, PROJECT_LIST_MAX_LIMIT } from "./useProjects";
import { sitesQueryOptions } from "./useSites";

/** E5 78 — "Güneşkent A-Blok" seçenek etiketi (proje adı + şantiye adı). */
export interface SiteOption {
  siteId: string;
  projectId: string;
  label: string;
}

export interface SiteOptionsState {
  options: SiteOption[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * Genel puantajın (E5) şantiye seçicisi.
 *
 * Backend'de ŞANTİYE-GENELİ bir liste ucu YOKTUR (`/projects/{id}/sites`
 * tek yol — openapi teyidi); seçenekler proje listesi üzerinden paralel
 * çekilir (`useQueries`, `useRolePermissions` deseni). Önbellek `useSites`
 * ile paylaşılır. Mockup TEK bir seçici çizer (E5 78), bu yüzden iki adımlı
 * "önce proje seç" akışı UYDURULMAZ — etiket ikisini birleştirir.
 */
export function useSiteOptions(): SiteOptionsState {
  // Sunucu varsayılanı 50'dir (`projects/router.py` `limit = 50`): limit
  // GÖNDERİLMEZSE 51. projenin şantiyeleri seçeneklere HİÇ girmez ve
  // kullanan ekran onları "atanmamış" sanar. Tavan AÇIKÇA gönderilir
  // (`useProjects.ts` kanonu: sessiz kırpma YOK).
  const projectsQuery = useProjects({ limit: PROJECT_LIST_MAX_LIMIT });
  const projects = projectsQuery.data?.items ?? [];
  const siteQueries = useQueries({
    queries: projects.map((project) => sitesQueryOptions(project.id)),
  });

  const options = projects.flatMap((project, index) => {
    const items = siteQueries[index]?.data?.items ?? [];
    return items.map((site) => ({
      siteId: site.id,
      projectId: project.id,
      label: `${project.name} ${site.name}`,
    }));
  });

  return {
    options,
    isLoading: projectsQuery.isLoading || siteQueries.some((query) => query.isLoading),
    isError: projectsQuery.isError || siteQueries.some((query) => query.isError),
  };
}
