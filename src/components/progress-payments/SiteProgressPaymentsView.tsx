"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { useProgressPayments, useProgressPaymentSummary } from "@/lib/api/hooks/useProgressPayments";
import { useSite } from "@/lib/api/hooks/useSites";
import { useSiteSubcontractorPayments } from "@/lib/api/hooks/useSiteSubcontractorPayments";
import { isForbidden } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import { ProgressPaymentsListBody } from "./ProgressPaymentsList";
import { ProgressPaymentsTotalsStrip } from "./ProgressPaymentsTotalsStrip";
import { SiteSubcontractorPaymentsPanel } from "./SiteSubcontractorPaymentsPanel";
import { computeProgressPaymentsTotals } from "./totals";
import { computeGrossMargin } from "./shared/margin";
import { computeSiteSubcontractorTotals } from "./shared/site-subcontractor-totals";
import "./progress-payments.css";
import "./site-progress-payments.css";

// Şantiye "Hakedişler" sekmesi (P7 T6 iskeleti + F-TH T5 taşeron sütunu).
// Mockup `Şantiye - Hakedişler.dc.html`. Kalıcı mimari karar (brief §Kalıcı
// mimari karar, kullanıcı kararı S4): hakediş SÖZLEŞME (proje) düzeyinde tek
// kayıttır, şantiye kırılımı satırdadır. Bu sekme `/hakedisler` ile AYNI
// kaydın başka görünümüdür — işveren tarafında şantiyeye göre süzülmüş sahte
// bir liste üretilmez, proje-düzeyi liste aynen basılır.
//
// KPI şeridi (satır 81-86, `ProgressPaymentsTotalsStrip.tsx`, T2 ile
// PAYLAŞILIR): "4 hakediş · %75" alt metni proje bağlamı bu ekranda
// BİLİNDİĞİNDEN `useProgressPaymentSummary(projectId)` ile TAM basılır.
//
// F-TH T5 (bu dilim) — taşeron tarafı GERÇEK veriyle dolduruldu:
//   - `useSiteSubcontractorPayments` (§site_id süzmesi GEÇİCİDİR, hook'un
//     kendi başlığına bakınız) proje-düzeyi taşeron hakedişlerini şantiyeye
//     süzer. `site_id === null` (proje-geneli) sözleşmeler BİLİNÇLİ olarak
//     HARİÇ TUTULUR (tek-anlamlılık kararı).
//   - "Toplam Taşeron Ödemesi" + "Brüt Kar Marjı" KPI'ları artık GERÇEK
//     (`computeSiteSubcontractorTotals` + `computeGrossMargin`, S2 kararı:
//     marj = (işveren−taşeron)/işveren). "Onay Bekleyen" iki tarafı toplar.
//   - Sözleşme detaylarının bir kısmı hata verirse (`isPartial`) toplam/marj
//     sessizce basılmaz — görünür hata bandı + pending gösterilir.
//   - Sağ sütun (`SiteSubcontractorPaymentsPanel`) satır tıklanabilir,
//     `/hakedisler/taseron/[paymentId]`e gider; "Tümü →" `/hakedisler/taseron`e.
//
// BASILMAYAN (mockup'ta var, bu dilimde veri yok — brief §pending-modules):
//   - Satır içi "%62 ilerleme" (satır 98, işveren) — liste şemasında yok.
//   - PDF / dışa aktarma — backend'de uç yok.
export function SiteProgressPaymentsView() {
  const { projectId, siteId } = useParams<{ projectId: string; siteId: string }>();
  // Breadcrumb için — drill kabuğu aynı anahtarı zaten çektiğinden ikinci
  // bir ağ isteği oluşmaz (React Query önbelleği; `is-kalemleri` deseni).
  const siteQuery = useSite(siteId);
  // Proje-düzeyi liste (S4 kararı) — `site_id` filtresi KULLANILMAZ.
  const paymentsQuery = useProgressPayments({ project_id: projectId });
  // KPI alt metni için — özet sorgusu hata verirse/yüklenmemişse SAYFA
  // KIRILMAZ, yalnız alt metin yüzdesiz kalır (T3 "özet hata verirse KPI
  // basılmaz" deseninin aynısı: `isSuccess` kontrolü, `isForbidden` sayfa
  // düzeyinde KULLANILMAZ — özet 403 dönse bile liste görünür kalmalı).
  const summaryQuery = useProgressPaymentSummary(projectId);
  const subcontractorPayments = useSiteSubcontractorPayments(projectId, siteId);
  const { canWrite } = useModulePermission("progress_payments");

  if (isForbidden(paymentsQuery.error) || isForbidden(siteQuery.error)) return <AccessDenied />;

  const site = siteQuery.data;
  const summary = summaryQuery.isSuccess
    ? { paymentCount: summaryQuery.data.payment_count, progressPct: summaryQuery.data.progress_pct }
    : undefined;

  const employerTotals = computeProgressPaymentsTotals(paymentsQuery.data?.items ?? []);
  const subcontractorTotals = computeSiteSubcontractorTotals(subcontractorPayments.items);
  const isSubcontractorDataComplete =
    !subcontractorPayments.isLoading && !subcontractorPayments.isError && !subcontractorPayments.isPartial;
  const marginPct = computeGrossMargin(
    employerTotals.grossTotal,
    subcontractorTotals.grossTotal,
    isSubcontractorDataComplete,
  );
  const hasSubcontractorError = subcontractorPayments.isError || subcontractorPayments.isPartial;

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
        <div>
          <h1 className="spp__title">{site ? `${site.name} — Hakedişler` : "Hakedişler"}</h1>
          <p className="spp__subtitle">İşveren &amp; Taşeron hakedişleri</p>
        </div>
        {canWrite && (
          <Link href={`/hakedisler/yeni?project=${projectId}`} className="pp__new-btn">
            + Hakediş Oluştur
          </Link>
        )}
      </div>

      <ProgressPaymentsTotalsStrip
        items={paymentsQuery.data?.items}
        summary={summary}
        subcontractor={{
          isLoading: subcontractorPayments.isLoading,
          isPartial: hasSubcontractorError,
          grossTotal: subcontractorTotals.grossTotal,
          distinctSubcontractorCount: subcontractorTotals.distinctSubcontractorCount,
          pendingApprovalCount: subcontractorTotals.pendingApprovalCount,
          marginPct,
        }}
      />

      {/* Kısmi hata görünürlüğü (brief §Yükleme/hata görünürlüğü): taşeron
          sözleşme detaylarının bir kısmı yüklenemediyse toplam/marj sessizce
          eksik basılmaz — bant görünür kalır. */}
      {hasSubcontractorError && (
        <p className="spp__error-band">
          {subcontractorPayments.isError
            ? "Taşeron hakedişleri yüklenemedi — taşeron toplamı ve kâr marjı gösterilemiyor."
            : `${subcontractorPayments.failedContractCount} taşeron sözleşmesi yüklenemedi — toplamlar ve kâr marjı eksik olabilir.`}
        </p>
      )}

      <div className="spp__columns">
        <section className="spp__panel spp__panel--employer">
          <div className="spp__panel-head">
            <span className="spp__panel-title">İşveren Hakedişleri</span>
            <Link href="/hakedisler" className="spp__panel-link">
              Tümü →
            </Link>
          </div>
          {/* Final inceleme #5: proje adı burada breadcrumb'ta zaten görünür —
              liste satırında tekrar basılmaz (`/hakedisler`de kalır, orada
              proje-genel liste birden fazla projeyi aynı anda gösterir). */}
          <ProgressPaymentsListBody
            isError={paymentsQuery.isError}
            isLoading={paymentsQuery.isLoading}
            data={paymentsQuery.data}
            showProjectName={false}
          />
        </section>

        <SiteSubcontractorPaymentsPanel
          items={subcontractorPayments.items}
          isLoading={subcontractorPayments.isLoading}
          isError={subcontractorPayments.isError}
        />
      </div>
    </div>
  );
}
