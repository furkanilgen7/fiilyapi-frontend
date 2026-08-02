"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { useProgressPayments } from "@/lib/api/hooks/useProgressPayments";
import { useSite } from "@/lib/api/hooks/useSites";
import { isForbidden } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import { ProgressPaymentsListBody } from "./ProgressPaymentsList";
import { ProgressPaymentsTotalsStrip } from "./ProgressPaymentsTotalsStrip";
import "./progress-payments.css";
import "./site-progress-payments.css";

// Şantiye "Hakedişler" sekmesi (P7 T6). Mockup `Şantiye - Hakedişler.dc.html`.
// Kalıcı mimari karar (brief §Kalıcı mimari karar, kullanıcı kararı S4):
// hakediş SÖZLEŞME (proje) düzeyinde tek kayıttır, şantiye kırılımı satırdadır.
// Bu sekme `/hakedisler` ile AYNI kaydın başka görünümüdür — şantiyeye göre
// süzülmüş sahte bir liste üretilmez, proje-düzeyi liste aynen basılır.
//
// KPI şeridi (satır 81-86) coordinator review T6 fix ile EKLENDİ — karma
// basılır (`ProgressPaymentsTotalsStrip.tsx`, T2 ile PAYLAŞILIR).
//
// BASILMAYANLAR (mockup'ta var, bu dilimde veri yok — brief
// §pending-modules ile BOŞ kalanlar):
//   - Taşeron Hakedişleri sütunu (satır 116-140) — taşeron hakediş modülü yok.
//   - Satır içi "%62 ilerleme" (satır 98) — liste şemasında ilerleme alanı yok.
//   - PDF / dışa aktarma — backend'de uç yok.
export function SiteProgressPaymentsView() {
  const { projectId, siteId } = useParams<{ projectId: string; siteId: string }>();
  // Breadcrumb için — drill kabuğu aynı anahtarı zaten çektiğinden ikinci
  // bir ağ isteği oluşmaz (React Query önbelleği; `is-kalemleri` deseni).
  const siteQuery = useSite(siteId);
  // Proje-düzeyi liste (S4 kararı) — `site_id` filtresi KULLANILMAZ.
  const paymentsQuery = useProgressPayments({ project_id: projectId });
  const { canWrite } = useModulePermission("progress_payments");

  if (isForbidden(paymentsQuery.error) || isForbidden(siteQuery.error)) return <AccessDenied />;

  const site = siteQuery.data;

  return (
    <div className="pp spp">
      {site && (
        <p className="spp__crumb">
          <Link className="spp__crumb-link" href={`/projeler/${projectId}/santiyeler/${siteId}`}>
            ← {site.name}
          </Link>
          {` · ${site.project.name} / ${site.name}`}
        </p>
      )}

      <div className="spp__title-bar">
        <h1 className="spp__title">{site ? `${site.name} — Hakedişler` : "Hakedişler"}</h1>
        {canWrite && (
          <Link href={`/hakedisler/yeni?project=${projectId}`} className="pp__new-btn">
            + Hakediş Oluştur
          </Link>
        )}
      </div>

      <ProgressPaymentsTotalsStrip items={paymentsQuery.data?.items} />

      <ProgressPaymentsListBody
        isError={paymentsQuery.isError}
        isLoading={paymentsQuery.isLoading}
        data={paymentsQuery.data}
      />
    </div>
  );
}
