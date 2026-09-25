"use client";

import { useCompany } from "@/lib/api/hooks/useCompany";

import { PanelScreen } from "../panel/PanelScreen";
import { useEvSiteParam } from "../kit/site-scope/useEvSiteParam";
import { buildGeneralReportLinks } from "./report-links";

/**
 * PLN-F3.6a · Planlama Paneli KÖK İKİZİ (`/planlama/panel?site=`), kabuk
 * nav'ının Planlama grubu. Desen `GeneralManHourBudgetView` ile BİREBİR:
 * `useEvSiteParam` şantiye durumunu (`?site=`) çözer, `key` şantiyeye
 * bağlıdır (çapraz-şantiye veri bulaşması bekçisi).
 */
export function GeneralPanelView() {
  const { selected, picker } = useEvSiteParam();
  const company = useCompany();
  return (
    <PanelScreen
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
