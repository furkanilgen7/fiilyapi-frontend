"use client";

import { useParams } from "next/navigation";

import { useSite } from "@/lib/api/hooks/useSites";
import { routes } from "@/lib/routes";

import { BudgetScreen } from "./BudgetScreen";

/**
 * PLN-F1.6 · Adam-Saat Bütçesi, şantiye rotası
 * (`/projeler/[projectId]/santiyeler/[siteId]/adam-saat-butcesi`).
 * Mockup: `Planlama - Adam-Saat Bütçesi.dc.html` (+ Ek Formlar M1–M6).
 *
 * Rota parametreleri "slug VEYA UUID" ADRES anahtarlarıdır (URL-3,
 * `SiteDiaryEntryView` deseni); EV uçları kanonik UUID ister → `useSite`
 * geçişi. Bağlantılar adres anahtarlarıyla kurulur (slug korunur).
 * Kırıntı ve kabuk uygulamanındır.
 */
export function ManHourBudgetView() {
  const { projectId: projectKey, siteId: siteKey } = useParams<{ projectId: string; siteId: string }>();
  const site = useSite(siteKey, { project: projectKey });
  const params = { projectId: projectKey, siteId: siteKey };
  return (
    <BudgetScreen
      siteId={site.data?.id ?? ""}
      links={{
        boq: routes.projects.sites.boq(params),
        sections: routes.projects.sites.detail(params),
        catalog: routes.planning.catalog(),
      }}
    />
  );
}
