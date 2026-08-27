"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { useProgressPayments, useProgressPaymentSummary } from "@/lib/api/hooks/useProgressPayments";
import { useSite } from "@/lib/api/hooks/useSites";
import {
  useSiteSubcontractorPayments,
  type UseSiteSubcontractorPaymentsResult,
} from "@/lib/api/hooks/useSiteSubcontractorPayments";
import { listTruncationMessage } from "@/lib/list-truncation";
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

// F-SZLEKR T2: düğme etiketi ve boş-durum ipucu AYNI sabitten okunur (bkz.
// `ProgressPaymentsView.tsx` üstündeki not). Bu ekranın etiketi ("+ Hakediş
// Oluştur") `ProgressPaymentsView`inkinden ("+ Yeni Hakediş") KASITLI OLARAK
// FARKLI — bu ayrı bir tutarsızlık, bu dilimin kapsamı DIŞINDA (rapora not
// düşüldü), etiketler burada BİRLEŞTİRİLMEDİ.
const NEW_PAYMENT_LABEL = "+ Hakediş Oluştur";

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
// F-TH T5/TB2 — taşeron tarafı GERÇEK veriyle dolduruldu:
//   - `useSiteSubcontractorPayments` U2'ye (`GET /subcontractor-progress-
//     payments`) `site_id` filtresiyle çıkar — süzme SUNUCUDA yapılır.
//     `site_id === null` (proje-geneli) sözleşmeler BİLİNÇLİ olarak
//     HARİÇ TUTULUR (tek-anlamlılık kararı, sunucu filtresinin kendisiyle).
//   - "Toplam Taşeron Ödemesi" + "Brüt Kar Marjı" KPI'ları artık GERÇEK
//     (`computeSiteSubcontractorTotals` + `computeGrossMargin`, S2 kararı:
//     marj = (işveren−taşeron)/işveren). "Onay Bekleyen" iki tarafı toplar.
//   - Hakediş listesi sunucu tavanında kırpılırsa (`isPartial`) toplam/marj
//     sessizce basılmaz — görünür hata bandı + pending gösterilir.
//   - Sağ sütun (`SiteSubcontractorPaymentsPanel`) satır tıklanabilir,
//     `/hakedisler/taseron/[paymentId]`e gider; "Tümü →" `/hakedisler/taseron`e.
//
// BASILMAYAN (mockup'ta var, bu dilimde veri yok — brief §pending-modules):
//   - Satır içi "%62 ilerleme" (satır 98, işveren) — liste şemasında yok.
//   - PDF / dışa aktarma — backend'de uç yok.
/**
 * Görünür bant metni — İKİ ayrı neden (uç hatası / sunucu tavanı) AYRI
 * cümlelerle basılır; kullanıcı hangi sayının neden eksik olduğunu görür
 * (final inceleme F-3). TB2 takip: üçüncü kanal ("kısmi sözleşme hatası" —
 * N+1 fan-out'un bir kısmı hata verirse) N+1 kaldırılınca ANLAMSIZLAŞTI ve
 * silindi; `isPartial` artık YALNIZ `truncation.isTruncated`e eşit.
 */
function subcontractorBandMessage(state: UseSiteSubcontractorPaymentsResult): string {
  if (state.isError) {
    return "Taşeron hakedişleri yüklenemedi — taşeron toplamı ve kâr marjı gösterilemiyor.";
  }
  return `${listTruncationMessage(state.truncation)} Taşeron toplamı ve kâr marjı bu yüzden gösterilmiyor.`;
}

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
            {NEW_PAYMENT_LABEL}
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

      {/* Kısmi veri görünürlüğü (brief §Yükleme/hata görünürlüğü + final
          inceleme F-3): taşeron sözleşme detaylarının bir kısmı yüklenemediyse
          YA DA hakediş listesi sunucu tavanında kırpıldıysa toplam/marj
          sessizce eksik basılmaz — bant görünür kalır, KPI'lar pending'e
          düşer (`isPartial` tek karar kanalı). */}
      {hasSubcontractorError && (
        <p className="spp__error-band" data-testid="spp-subcontractor-band">
          {subcontractorBandMessage(subcontractorPayments)}
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
            newActionLabel={canWrite ? NEW_PAYMENT_LABEL : null}
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
