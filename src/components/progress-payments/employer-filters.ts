// F-PRJTAB T3 · İşveren Hakediş listesinin (`/hakedisler`) proje süzgeci.
// Süzgeç bileşen state'inde DEĞİL URL'de yaşar (paylaşılabilir, geri/ileri
// çalışır) — kardeş ekran `/hakedisler/taseron` ile AYNI desen ve AYNI
// parametre adı (`project_id`), bkz. `subcontractor-filters.ts`.
//
// Backend `GET /progress-payments` üç süzgeç kabul eder (`project_id`,
// `site_id`, `status`); bu ekranda mockup yalnız proje seçicisi istediği için
// burada TEK alan ayrıştırılır — uydurma alan eklenmez.

export interface EmployerFiltersState {
  projectId: string | null;
}

/** URL query → tipli filtre durumu. Eksik/boş alan sessizce `null`a düşer. */
export function parseEmployerFilters(searchParams: URLSearchParams): EmployerFiltersState {
  return { projectId: searchParams.get("project_id") || null };
}
