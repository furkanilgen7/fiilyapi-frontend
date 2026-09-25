"use client";

import { useParams } from "next/navigation";

import { useCompany } from "@/lib/api/hooks/useCompany";
import { useSite } from "@/lib/api/hooks/useSites";

import { PanelScreen } from "../panel/PanelScreen";
import { buildSiteReportLinks } from "./report-links";

/**
 * PLN-F3.6a · Planlama Paneli, şantiye rotası
 * (`/projeler/[projectId]/santiyeler/[siteId]/planlama-paneli`). Desen
 * `ManHourBudgetView` ile BİREBİR: rota parametreleri ADRES anahtarlarıdır
 * (slug VEYA UUID), `useSite` kanonik UUID'ye geçer.
 */
export function SitePanelView() {
  const { projectId: projectKey, siteId: siteKey } = useParams<{ projectId: string; siteId: string }>();
  const site = useSite(siteKey, { project: projectKey });
  const company = useCompany();
  return (
    <PanelScreen
      siteId={site.data?.id ?? ""}
      siteName={site.data?.name ?? ""}
      companyName={company.data?.name ?? ""}
      projectName={site.data?.project.name ?? ""}
      siteCompleted={site.data?.status === "completed"}
      links={buildSiteReportLinks({ projectId: projectKey, siteId: siteKey })}
    />
  );
}
