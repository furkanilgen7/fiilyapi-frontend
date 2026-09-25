"use client";

import { useParams } from "next/navigation";

import { useCompany } from "@/lib/api/hooks/useCompany";
import { useSite } from "@/lib/api/hooks/useSites";

import { DailyReportScreen } from "../daily/DailyReportScreen";
import { buildSiteReportLinks } from "./report-links";

/**
 * PLN-F3.6a · Günlük İlerleme Raporu, şantiye rotası
 * (`/projeler/[projectId]/santiyeler/[siteId]/gunluk-ilerleme-raporu`).
 * Desen `ManHourBudgetView`/`SitePanelView` ile BİREBİR.
 */
export function SiteDailyReportView() {
  const { projectId: projectKey, siteId: siteKey } = useParams<{ projectId: string; siteId: string }>();
  const site = useSite(siteKey, { project: projectKey });
  const company = useCompany();
  return (
    <DailyReportScreen
      siteId={site.data?.id ?? ""}
      siteName={site.data?.name ?? ""}
      companyName={company.data?.name ?? ""}
      projectName={site.data?.project.name ?? ""}
      siteCompleted={site.data?.status === "completed"}
      links={buildSiteReportLinks({ projectId: projectKey, siteId: siteKey })}
    />
  );
}
