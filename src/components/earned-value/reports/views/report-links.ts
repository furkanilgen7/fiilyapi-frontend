import { routes, type SiteParams } from "@/lib/routes";

import type { ReportLinks } from "../kit/report-screen";

/**
 * PLN-F3.6a · `ReportLinks`in TEK üreticisi — ekranlar (`WeeklyQurrScreen`,
 * `DailyReportScreen`, `PanelScreen`) kendi yol KURMAZ (URL-1), bu iki
 * fonksiyondan birini alır.
 *
 * 🔴 KÖK İKİZDE SİTE TAŞINIR (lider denetimi, F3.6a-ek): `routes.planning.
 * panel/dailyReport/weeklyReport/budget` `?site=` KABUL EDER — kullanıcı
 * Panel'den GİR'e/QURR'a geçince seçili şantiye AYNI kalır, yoksa hedef
 * ekran `?site=`SİZ açılır ve İLK seçeneğe döner (başka bir şantiye).
 */
export function buildSiteReportLinks(params: SiteParams): ReportLinks {
  return {
    diary: (day) => routes.projects.sites.diary({ ...params, date: day }),
    budget: routes.projects.sites.evBudget(params),
    dailyReport: (date) => routes.projects.sites.evDailyReport({ ...params, date }),
    weeklyReport: (week) => routes.projects.sites.evWeeklyReport({ ...params, week }),
    panel: routes.projects.sites.evPanel(params),
  };
}

/** Kök ikizler (`/planlama/panel` vb.) — `siteId` HER bağlantıya `?site=` ile TAŞINIR. */
export function buildGeneralReportLinks(siteId: string): ReportLinks {
  return {
    diary: (day) => routes.siteDiary({ site: siteId, date: day }),
    budget: routes.planning.budget({ site: siteId }),
    dailyReport: (date) => routes.planning.dailyReport({ site: siteId, date }),
    weeklyReport: (week) => routes.planning.weeklyReport({ site: siteId, week }),
    panel: routes.planning.panel({ site: siteId }),
  };
}
