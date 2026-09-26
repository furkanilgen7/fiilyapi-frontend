"use client";

import { useParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { useCompany } from "@/lib/api/hooks/useCompany";
import { useSite } from "@/lib/api/hooks/useSites";
import { isForbidden } from "@/lib/api/unwrap";

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
  // FIX-F2 · Ajan B madde 4 — emsal `SitePlanningView.tsx:91`: şantiye
  // çözülemezse (404/ağ) `siteId` boş kalır ve `WeeklyQurrScreen` içindeki
  // rapor sorgusu boş id'de sessizce idle'da durur — hiç hata basılmadan
  // SONSUZ İSKELET görünürdü. `useSite` hatası BURADA iletilir.
  if (isForbidden(site.error)) return <AccessDenied />;
  if (site.isError) return <p>Şantiye yüklenemedi</p>;
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
