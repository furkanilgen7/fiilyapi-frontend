import { isoWeekOf } from "@/components/timesheet/iso-week";
import { routes } from "@/lib/routes";

/**
 * PLN-F2.1b · G12a boş hâli "Bu gün için puantaj girilmemiş · Puantaja git".
 *
 * Hedef ŞANTİYENİN puantaj sekmesidir (`routes.projects.sites.timesheet`) —
 * kök ikizde (`/gunluk-kayit?site=`) de: o rotada `projectKey`/`siteKey`
 * seçili şantiyenin kanonik kimlikleridir ve mod anahtarı da aynı şantiye
 * kapsamlı rotalara gider.
 *
 * Hafta, puantaj ekranının okuduğu anahtarlarla (`?iso_year=&iso_week=`) rota
 * üreticisinden gelir; eşlik `diary-timesheet-link.test.ts`te ekranın
 * ayrıştırıcısıyla geri okunarak bekçilenir.
 */
export function diaryTimesheetHref(params: { projectKey: string; siteKey: string; day: string }): string {
  const week = isoWeekOf(params.day);
  return routes.projects.sites.timesheet({
    projectId: params.projectKey,
    siteId: params.siteKey,
    isoYear: week.isoYear,
    isoWeek: week.isoWeek,
  });
}
