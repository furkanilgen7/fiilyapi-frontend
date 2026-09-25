"use client";

import { useParams } from "next/navigation";

import { useCompany } from "@/lib/api/hooks/useCompany";
import { useSite } from "@/lib/api/hooks/useSites";

import { WeeklyQurrScreen } from "../qurr/WeeklyQurrScreen";
import { buildSiteReportLinks } from "./report-links";

/**
 * PLN-F3.6a · Haftalık QURR, şantiye rotası
 * (`/projeler/[projectId]/santiyeler/[siteId]/haftalik-qurr`). Desen
 * `ManHourBudgetView`/`SitePanelView` ile BİREBİR.
 */
export function SiteWeeklyQurrView() {
  const { projectId: projectKey, siteId: siteKey } = useParams<{ projectId: string; siteId: string }>();
  const site = useSite(siteKey, { project: projectKey });
  const company = useCompany();
  return (
    <WeeklyQurrScreen
      siteId={site.data?.id ?? ""}
      siteName={site.data?.name ?? ""}
      companyName={company.data?.name ?? ""}
      projectName={site.data?.project.name ?? ""}
      siteCompleted={site.data?.status === "completed"}
      links={buildSiteReportLinks({ projectId: projectKey, siteId: siteKey })}
    />
  );
}
