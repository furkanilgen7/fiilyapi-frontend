import { useQueries } from "@tanstack/react-query";

import { useProjects } from "./useProjects";
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
  const projectsQuery = useProjects();
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
