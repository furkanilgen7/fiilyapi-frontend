"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { useProgressPayments, useProgressPaymentSummary } from "@/lib/api/hooks/useProgressPayments";
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
// basılır (`ProgressPaymentsTotalsStrip.tsx`, T2 ile PAYLAŞILIR). Round 2
// (coordinator review): "4 hakediş · %75" alt metni (satır 82) proje bağlamı
// bu ekranda BİLİNDİĞİNDEN `useProgressPaymentSummary(projectId)` ile TAM
// basılır — T3'ün detay ekranındaki desenin aynısı (`ProgressPaymentDetailView`
// satır 39, 52). `/hakedisler` genel listesinde tek bir proje yok, o yüzden
// bu sorgu ORADA HİÇ ÇAĞRILMAZ (bkz. `ProgressPaymentsView.tsx`).
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
  // KPI alt metni için — özet sorgusu hata verirse/yüklenmemişse SAYFA
  // KIRILMAZ, yalnız alt metin yüzdesiz kalır (T3 "özet hata verirse KPI
  // basılmaz" deseninin aynısı: `isSuccess` kontrolü, `isForbidden` sayfa
  // düzeyinde KULLANILMAZ — özet 403 dönse bile liste görünür kalmalı).
  const summaryQuery = useProgressPaymentSummary(projectId);
  const { canWrite } = useModulePermission("progress_payments");

  if (isForbidden(paymentsQuery.error) || isForbidden(siteQuery.error)) return <AccessDenied />;

  const site = siteQuery.data;
  const summary = summaryQuery.isSuccess
    ? { paymentCount: summaryQuery.data.payment_count, progressPct: summaryQuery.data.progress_pct }
    : undefined;

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

      <ProgressPaymentsTotalsStrip items={paymentsQuery.data?.items} summary={summary} />

      {/* Final inceleme #5: proje adı burada breadcrumb'ta zaten görünür —
          liste satırında tekrar basılmaz (`/hakedisler`de kalır, orada
          proje-genel liste birden fazla projeyi aynı anda gösterir). */}
      <ProgressPaymentsListBody
        isError={paymentsQuery.isError}
        isLoading={paymentsQuery.isLoading}
        data={paymentsQuery.data}
        showProjectName={false}
      />
    </div>
  );
}
