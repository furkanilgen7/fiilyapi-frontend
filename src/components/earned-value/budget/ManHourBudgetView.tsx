"use client";

import { useParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { useSite } from "@/lib/api/hooks/useSites";
import { isForbidden } from "@/lib/api/unwrap";
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
 * Şantiye durumu `useSite` yanıtından (`status === "completed"` → salt okunur, B1-12).
 * Kırıntı ve kabuk uygulamanındır.
 */
export function ManHourBudgetView() {
  const { projectId: projectKey, siteId: siteKey } = useParams<{ projectId: string; siteId: string }>();
  const site = useSite(siteKey, { project: projectKey });
  const params = { projectId: projectKey, siteId: siteKey };
  // FIX-F2 · Ajan B madde 4 — emsal `SitePlanningView.tsx:91`: şantiye
  // çözülemezse (404/ağ) `siteId` boş kalır ve `BudgetScreen` içindeki bütçe
  // sorgusu boş id'de sessizce idle'da durur — hiç hata basılmadan SONSUZ
  // İSKELET görünürdü. `useSite` hatası BURADA iletilir.
  if (isForbidden(site.error)) return <AccessDenied />;
  if (site.isError) return <p>Şantiye yüklenemedi</p>;
  return (
    <BudgetScreen
      siteId={site.data?.id ?? ""}
      siteCompleted={site.data?.status === "completed"}
      links={{
        boq: routes.projects.sites.boq(params),
        sections: routes.projects.sites.detail(params),
        catalog: routes.planning.catalog(),
      }}
    />
  );
}
