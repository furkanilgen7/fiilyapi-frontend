"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select } from "@/components/ui/select";
import { useProjects } from "@/lib/api/hooks/useProjects";

import { parseEmployerFilters } from "./employer-filters";
// URL yamalama mantığı kardeş ekranla ORTAKTIR (kopyalanmaz): mevcut
// parametrelerin üstüne yama uygular, yeni bir `URLSearchParams` döner,
// `null`/boş değer alanı siler.
import { withSubcontractorFilterParams } from "./subcontractor-filters";
import "./progress-payments.css";

/** Seçicinin "süzgeç yok" değeri — seçilince `project_id` URL'den düşer. */
const ALL_VALUE = "";

/**
 * F-PRJTAB T3 · `/hakedisler` proje süzgeci. Proje detayının "İşveren
 * Hakediş" sekmesi bu ekrana `?project_id=<id>` ile gelir; süzgeç görünür
 * olmalı (kullanıcı neye baktığını bilmeli) ve temizlenebilmeli. Kardeş
 * ekranın (`SubcontractorProgressPaymentsFilters`) canlı emsali izlenir:
 * `<Select>` + "Tüm Projeler" seçeneği ile temizleme; seçim ANINDA URL'e
 * yazılır (`router.replace`, debounce gerekmez).
 */
export function ProgressPaymentsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseEmployerFilters(searchParams);
  const projectsQuery = useProjects();

  function handleProjectChange(projectId: string) {
    const next = withSubcontractorFilterParams(searchParams, {
      project_id: projectId || null,
    });
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="pp-filters">
      <Select
        aria-label="Proje filtresi"
        value={filters.projectId ?? ALL_VALUE}
        onChange={(event) => handleProjectChange(event.target.value)}
      >
        <option value={ALL_VALUE}>Tüm Projeler</option>
        {projectsQuery.data?.items.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
