"use client";

import { useCompany } from "@/lib/api/hooks/useCompany";

import { DailyReportScreen } from "../daily/DailyReportScreen";
import { useEvSiteParam } from "../kit/site-scope/useEvSiteParam";
import { buildGeneralReportLinks } from "./report-links";

/**
 * PLN-F3.6a · Günlük İlerleme Raporu KÖK İKİZİ (`/planlama/gunluk-rapor?site=`).
 * Desen `GeneralPanelView`/`GeneralManHourBudgetView` ile BİREBİR.
 */
export function GeneralDailyReportView() {
  const { selected, picker } = useEvSiteParam();
  const company = useCompany();
  return (
    <DailyReportScreen
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
