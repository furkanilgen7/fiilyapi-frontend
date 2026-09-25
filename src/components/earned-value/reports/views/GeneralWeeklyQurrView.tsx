"use client";

import { useCompany } from "@/lib/api/hooks/useCompany";

import { WeeklyQurrScreen } from "../qurr/WeeklyQurrScreen";
import { useEvSiteParam } from "../kit/site-scope/useEvSiteParam";
import { buildGeneralReportLinks } from "./report-links";

/**
 * PLN-F3.6a · Haftalık QURR KÖK İKİZİ (`/planlama/haftalik-qurr?site=`).
 * Desen `GeneralPanelView`/`GeneralManHourBudgetView` ile BİREBİR.
 */
export function GeneralWeeklyQurrView() {
  const { selected, picker } = useEvSiteParam();
  const company = useCompany();
  return (
    <WeeklyQurrScreen
      key={selected?.siteId ?? ""}
      siteId={selected?.siteId ?? ""}
      siteName={selected?.siteName ?? ""}
      companyName={company.data?.name ?? ""}
      projectName={selected?.projectName ?? ""}
      siteCompleted={selected?.isCompleted ?? false}
      links={buildGeneralReportLinks(selected?.siteId ?? "")}
      picker={picker}
    />
  );
}
